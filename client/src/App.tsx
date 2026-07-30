import { useState, useRef, useCallback, useEffect } from "react"
import { Coins, X } from "lucide-react"
import InfiniteDotCanvas, { type InfiniteDotCanvasHandle } from "./components/InfiniteDotCanvas"
import ProjectsOverlay from "./components/ProjectsOverlay"
import ProfileButton from "./components/ProfileButton"
import BottomBar from "./components/BottomBar"
import AccountSettingsModal from "./components/AccountSettingsModal"
import { LandingPage } from "./components/LandingPage"
import AuthGate from "./components/AuthGate"
import { useTheme } from "./context/theme"
import {
  clearSession,
  createCastingCall,
  createCrewPosting,
  generateCostumePlans,
  generateFilmBudget,
  generateScript,
  getStoredSession,
  searchAgentAssets,
  scoutLocations,
  searchMusicTracks,
} from "./lib/api"
import { type AgentKind, type AgentNode } from "./types/agent"
import { type Project } from "./types/project"

const PROJECT_HISTORY_STORAGE_KEY = "movie_agent_project_history"
const CHILD_NODE_X_OFFSET = 320

type ProjectHistoryState = Record<string, AgentNode[]>

function App() {
  const { resolvedTheme } = useTheme()
  const [session, setSession] = useState(() => getStoredSession())
  const [viewMode, setViewMode] = useState<"landing" | "login" | "studio">("landing")
  const [zoom, setZoom] = useState(1)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [dynamicBudgetData, setDynamicBudgetData] = useState<import("./lib/api").BudgetPlansData | null>(null)
  const [isLoadingBudget, setIsLoadingBudget] = useState(false)
  const [activePlanIdx, setActivePlanIdx] = useState(0)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [agentNodes, setAgentNodes] = useState<AgentNode[]>([])
  const [projectHistory, setProjectHistory] = useState<ProjectHistoryState>(() => loadProjectHistory())
  const canvasRef = useRef<InfiniteDotCanvasHandle>(null)
  const agentControllersRef = useRef(new Map<string, AbortController>())
  const agentTimeoutsRef = useRef(new Map<string, number>())
  const currentProjectNodes = selectedProject ? projectHistory[selectedProject.id] ?? [] : []

  const projectHistoryRef = useRef(projectHistory)
  useEffect(() => {
    setDynamicBudgetData(null)
    setActivePlanIdx(0)
  }, [selectedProject?.id])

  useEffect(() => {
    if (isBudgetModalOpen && selectedProject && session?.token && !dynamicBudgetData && !isLoadingBudget) {
      setIsLoadingBudget(true)
      generateFilmBudget(session.token, selectedProject.id, `Generate budget for ${selectedProject.title}`)
        .then((res) => {
          setDynamicBudgetData(res)
          setIsLoadingBudget(false)
        })
        .catch(() => {
          setIsLoadingBudget(false)
        })
    }
  }, [isBudgetModalOpen, selectedProject, session?.token, dynamicBudgetData, isLoadingBudget])
  
  useEffect(() => {
    projectHistoryRef.current = projectHistory
    persistProjectHistory(projectHistory)
  }, [projectHistory])

  useEffect(() => {
    if (!selectedProject) {
      setAgentNodes([])
      return
    }
    setAgentNodes(projectHistory[selectedProject.id] ?? [])
  }, [projectHistory, selectedProject])

  const syncProjectNodes = useCallback((projectId: string, updater: (nodes: AgentNode[]) => AgentNode[]) => {
    setProjectHistory((history) => {
      const nextNodes = updater(history[projectId] ?? [])
      return { ...history, [projectId]: nextNodes }
    })
  }, [])

  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomIn()
  }, [])

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomOut()
  }, [])

  const handleZoomReset = useCallback(() => {
    canvasRef.current?.resetView()
  }, [])

  const handleFocusStoryboard = useCallback(() => {
    canvasRef.current?.focusStoryboard()
  }, [])

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  const handleSignOut = useCallback(() => {
    for (const timeoutId of agentTimeoutsRef.current.values()) window.clearTimeout(timeoutId)
    agentTimeoutsRef.current.clear()
    for (const controller of agentControllersRef.current.values()) controller.abort()
    agentControllersRef.current.clear()
    clearSession()
    setSession({ token: null, email: null })
    setSelectedProject(null)
    setAgentNodes([])
    setViewMode("landing")
  }, [])

  const updateAgentNode = useCallback((id: string, patch: Partial<AgentNode>) => {
    const projectId = selectedProject?.id
    if (!projectId) return
    syncProjectNodes(projectId, (nodes) => nodes.map((node) => node.id === id ? { ...node, ...patch } : node))
  }, [selectedProject?.id, syncProjectNodes])

  const stopAgent = useCallback((id: string) => {
    agentControllersRef.current.get(id)?.abort()
    agentControllersRef.current.delete(id)
    updateAgentNode(id, { status: "stopped", summary: "Stopped by you." })
  }, [updateAgentNode])

  const startAgentNode = useCallback((node: AgentNode, taskPrompt: string, delayMs = 0) => {
    const projectId = selectedProject?.id
    const token = session.token
    if (!projectId || !token || node.kind === "planner") return

    const run = async () => {
      agentControllersRef.current.get(node.id)?.abort()
      agentControllersRef.current.delete(node.id)

      const controller = new AbortController()
      agentControllersRef.current.set(node.id, controller)

      // If Asset Scout, wait until Script, Casting, & Location agents in batch complete
      if (node.kind === "assets" && !node.isFollowUp) {
        updateAgentNode(node.id, {
          status: "running",
          summary: "Waiting for script, casting, & location agents to finish...",
          progress: 10,
        })

        const startTime = Date.now()
        while (Date.now() - startTime < 30000) {
          if (controller.signal.aborted) return
          const currentNodes = projectHistoryRef.current[projectId] ?? []
          const batchNodes = currentNodes.filter((n: AgentNode) => n.batchId === node.batchId && n.id !== node.id)
          const pendingPrior = batchNodes.filter(
            (n: AgentNode) => (n.kind === "script" || n.kind === "casting" || n.kind === "location") && (n.status === "running" || n.status === "queued")
          )
          if (pendingPrior.length === 0) break
          await new Promise((r) => setTimeout(r, 700))
        }
      }

      if (controller.signal.aborted) return

      updateAgentNode(node.id, {
        status: "running",
        summary: runningSummaryForKind(node.kind),
        progress: 35,
        error: undefined,
      })

      const progressInterval = window.setInterval(() => {
        syncProjectNodes(projectId, (nodes) =>
          nodes.map((n) => {
            if (n.id !== node.id || n.status !== "running") return n
            const next = Math.min((n.progress ?? 35) + Math.random() * 18, 92)
            return { ...n, progress: next }
          })
        )
      }, 800)

      const latestProjectNodes = projectHistoryRef.current[projectId] ?? []

      runAgentTask(node.kind, token, projectId, taskPrompt, controller.signal, latestProjectNodes, selectedProject?.title)
        .then((summary) => {
          if (controller.signal.aborted) return
          updateAgentNode(node.id, { status: "done", summary, progress: 100 })
        })
        .catch((err) => {
          if (controller.signal.aborted) {
            updateAgentNode(node.id, { status: "stopped", summary: "Stopped by you.", progress: undefined })
            return
          }
          updateAgentNode(node.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Agent failed",
            summary: "The backend could not complete this task.",
            progress: undefined,
          })
        })
        .finally(() => {
          window.clearInterval(progressInterval)
          agentControllersRef.current.delete(node.id)
        })
    }

    if (delayMs > 0) {
      const timeoutId = window.setTimeout(() => {
        agentTimeoutsRef.current.delete(node.id)
        run()
      }, delayMs)
      agentTimeoutsRef.current.set(node.id, timeoutId)
      return
    }

    run()
  }, [selectedProject?.id, session.token, syncProjectNodes, updateAgentNode])

  const messageAgent = useCallback((id: string, message: string) => {
    const followUp = message.trim()
    if (!followUp) return

    const parent = currentProjectNodes.find((n) => n.id === id)
    const projectId = selectedProject?.id
    const token = session.token
    if (!parent || !projectId || !token) return

    const startedAt = Date.now()
    const taskPrompt = buildFollowUpPrompt(parent, followUp)

    if (parent.kind === "planner") {
      const workerKinds: AgentKind[] = ["script", "casting", "costume", "location", "music", "crew", "assets"]
      const newNodes = workerKinds.map((kind, i) =>
        createNode(
          createNodeId(kind),
          parent.batchId,
          kind,
          titleForKind(kind),
          followUp,
          "queued",
          parent.x + CHILD_NODE_X_OFFSET,
          parent.y + (i - (workerKinds.length - 1) / 2) * 200,
          startedAt + i,
          undefined,
          parent.id,
          true,
        )
      )

      syncProjectNodes(projectId, (nodes) => [...nodes, ...newNodes])
      newNodes.forEach((node, i) => startAgentNode(node, taskPrompt, i * 400))
      return
    }

    const newNode = createNode(
      createNodeId(parent.kind),
      parent.batchId,
      parent.kind,
      parent.title,
      followUp,
      "queued",
      parent.x + CHILD_NODE_X_OFFSET,
      parent.y,
      startedAt,
      undefined,
      parent.id,
      true,
    )

    syncProjectNodes(projectId, (nodes) => [...nodes, newNode])
    startAgentNode(newNode, taskPrompt)
  }, [currentProjectNodes, selectedProject?.id, session.token, startAgentNode, syncProjectNodes])

  const moveAgentNode = useCallback((id: string, x: number, y: number) => {
    const projectId = selectedProject?.id
    if (!projectId) return
    syncProjectNodes(projectId, (nodes) =>
      nodes.map((n) => n.id === id ? { ...n, x, y, isManuallyPositioned: true } : n)
    )
  }, [selectedProject?.id, syncProjectNodes])

  const editBatchPrompt = useCallback((batchId: string, prompt: string) => {
    const projectId = selectedProject?.id
    if (!projectId) return
    syncProjectNodes(projectId, (nodes) =>
      nodes.map((node) => {
        if (node.batchId !== batchId) return node
        const nextNode: AgentNode = { ...node, prompt }
        if (node.status === "running" && node.summary?.startsWith("Working on:")) {
          nextNode.summary = `Working on: ${prompt}`
        }
        return nextNode
      })
    )
  }, [selectedProject?.id, syncProjectNodes])

  const deleteBatch = useCallback((batchId: string) => {
    const projectId = selectedProject?.id
    if (!projectId) return

    const batchNodes = currentProjectNodes.filter((node) => node.batchId === batchId)
    for (const node of batchNodes) {
      const timeoutId = agentTimeoutsRef.current.get(node.id)
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
        agentTimeoutsRef.current.delete(node.id)
      }
      const controller = agentControllersRef.current.get(node.id)
      if (controller) {
        controller.abort()
        agentControllersRef.current.delete(node.id)
      }
    }

    syncProjectNodes(projectId, (nodes) => nodes.filter((node) => node.batchId !== batchId))
  }, [currentProjectNodes, selectedProject?.id, syncProjectNodes])

  const runPrompt = useCallback((prompt: string) => {
    const project = selectedProject
    const token = session.token
    const startedAt = Date.now()
    const batchId = `batch-${startedAt}-${Math.random().toString(36).slice(2, 8)}`
    const plannerId = createNodeId("planner")

    if (!project || !token) {
      setAgentNodes((nodes) => [
        ...nodes,
        createNode(plannerId, batchId, "planner", "Planner", prompt, "error", 0, -120, startedAt, "Create or select a project before sending agent work."),
      ])
      return
    }

    // Place each prompt batch in its own lane based on existing planner groups.
    const batch = currentProjectNodes.filter((node) => node.kind === "planner").length
    const bx = batch * 200
    const by = batch * 380

    const workerKinds: AgentKind[] = ["script", "casting", "costume", "location", "music", "crew", "assets"]
    const plannerSummary = `Dispatching ${workerKinds.length} agents in parallel for "${project.title}".`
    // Generous initial spacing ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â overlay will reflow based on actual heights
    const workerSpacing = 500

    // Left-to-right: planner on the left, workers stacked to the right
    // Workers sit 600px to the right of the planner center ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â real gap handled by overlay
    const newNodes: AgentNode[] = [
      createNode(plannerId, batchId, "planner", "Planner", prompt, "done", bx - 420, by, startedAt, plannerSummary),
      ...workerKinds.map((kind, i) =>
        createNode(
          createNodeId(kind),
          batchId,
          kind,
          titleForKind(kind),
          prompt,
          "queued",
          bx + 280,
          by + (i - (workerKinds.length - 1) / 2) * workerSpacing,
          startedAt + i,
          undefined,
          plannerId,
        )
      ),
    ]

    syncProjectNodes(project.id, (nodes) => [...nodes.slice(-20), ...newNodes])

    const workers = newNodes.filter((n) => n.kind !== "planner")
    workers.forEach((node, i) => startAgentNode(node, prompt, i * 800))
  }, [currentProjectNodes, selectedProject, session.token, startAgentNode, syncProjectNodes])

  if (viewMode === "landing") {
    return (
      <LandingPage
        onEnterStudio={() => {
          if (session.token) {
            setViewMode("studio")
          } else {
            setViewMode("login")
          }
        }}
        onLoginClick={() => setViewMode("login")}
      />
    )
  }

  if (viewMode === "login" || !session.token) {
    return (
      <AuthGate
        onAuthenticated={(token, email) => {
          setSession({ token, email })
          setViewMode("studio")
        }}
        onBackToLanding={() => setViewMode("landing")}
      />
    )
  }

  return (
    <main
      className="relative w-screen h-screen m-0 p-0 overflow-hidden select-none theme-transition"
      style={{ backgroundColor: "var(--t-bg-page)" }}
    >
      <div className="absolute top-6 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          <ProjectsOverlay
            token={session.token}
            selectedProjectId={selectedProject?.id}
            onSelectProject={setSelectedProject}
          />
          <button
            type="button"
            onClick={() => setIsBudgetModalOpen((open) => !open)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border backdrop-blur-md ${
              isBudgetModalOpen
                ? resolvedTheme === "light"
                  ? "bg-zinc-950 text-white border-zinc-900 shadow-md font-extrabold"
                  : "bg-white text-black border-white shadow-md font-extrabold"
                : resolvedTheme === "light"
                  ? "bg-white/90 text-zinc-900 border-zinc-300 hover:bg-zinc-100 shadow-sm"
                  : "bg-zinc-900/90 text-zinc-200 border-zinc-800 hover:bg-zinc-800 shadow-sm"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>{isBudgetModalOpen ? "Hide Film Budget" : "Film Budget (INR)"}</span>
          </button>
        </div>
        <div className="pointer-events-auto">
          <ProfileButton
            email={session.email ?? undefined}
            onOpenSettings={() => setSettingsOpen(true)}
            onSignOut={handleSignOut}
          />
        </div>
      </div>

      <InfiniteDotCanvas
        ref={canvasRef}
        zoom={zoom}
        onZoomChange={setZoom}
        agentNodes={agentNodes}
        onStopAgent={stopAgent}
        onMoveNode={moveAgentNode}
        onEditBatchPrompt={editBatchPrompt}
        onDeleteBatch={deleteBatch}
        onMessageAgent={messageAgent}
      />

      <BottomBar
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onFullscreen={handleFullscreen}
        onHome={handleFocusStoryboard}
        onSubmitPrompt={runPrompt}
        disabled={!selectedProject}
      />

      <AccountSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Pro Dynamic Theme-Adaptive Film Budget Modal Overlay */}
      {isBudgetModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl transition-all duration-300 ${
          resolvedTheme === "light" ? "bg-black/40" : "bg-black/85"
        }`}>
          <div
            className={`w-full max-w-2xl rounded-3xl p-7 border shadow-2xl space-y-6 theme-transition max-h-[88vh] overflow-y-auto custom-scrollbar relative ${
              resolvedTheme === "light"
                ? "bg-white border-zinc-200 text-zinc-900"
                : "bg-zinc-950 border-zinc-800 text-white"
            }`}
          >
            {/* Apple Minimalist Close Button */}
            <button
              type="button"
              onClick={() => setIsBudgetModalOpen(false)}
              className={`absolute top-6 right-6 p-2 rounded-full transition-all cursor-pointer z-10 ${
                resolvedTheme === "light"
                  ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900"
                  : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white"
              }`}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Badge & Title */}
            <div className="space-y-1 pr-10">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                  resolvedTheme === "light"
                    ? "bg-zinc-100 text-zinc-800 border-zinc-300"
                    : "bg-zinc-800 text-zinc-200 border-zinc-700"
                }`}>
                  Financial Controller
                </span>
                <span className={`text-[10px] font-medium ${resolvedTheme === "light" ? "text-zinc-500" : "text-zinc-400"}`}>
                  {selectedProject ? selectedProject.title : "Film Project"}
                </span>
              </div>
              <h3 className={`text-xl font-bold tracking-tight ${resolvedTheme === "light" ? "text-zinc-900" : "text-white"}`}>
                Film Production Budget (INR)
              </h3>
            </div>

            {isLoadingBudget ? (
              <div className="py-16 text-center space-y-3">
                <div className="flex justify-center">
                  <div className={`w-8 h-8 rounded-full border-2 animate-spin ${
                    resolvedTheme === "light" ? "border-zinc-300 border-t-zinc-900" : "border-white/20 border-t-white"
                  }`}></div>
                </div>
                <p className={`text-xs font-medium ${resolvedTheme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  Analyzing story concept & generating dynamic film line-item budget...
                </p>
              </div>
            ) : dynamicBudgetData && dynamicBudgetData.plans && dynamicBudgetData.plans.length > 0 ? (
              <>
                {/* Dynamic AI Tier Segmented Switcher */}
                <div className={`p-1 rounded-2xl border flex items-center gap-1 ${
                  resolvedTheme === "light" ? "bg-zinc-100 border-zinc-200" : "bg-zinc-900 border-zinc-800"
                }`}>
                  {dynamicBudgetData.plans.map((plan, idx) => {
                    const isActive = idx === activePlanIdx
                    const totalStr = plan.formatted_total ?? (plan.total_budget ? `₹${(plan.total_budget / 100000).toFixed(1)}L` : "")
                    return (
                      <button
                        key={plan.plan_id || idx}
                        type="button"
                        onClick={() => setActivePlanIdx(idx)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer text-center truncate ${
                          isActive
                            ? resolvedTheme === "light"
                              ? "bg-zinc-950 text-white font-extrabold shadow-sm"
                              : "bg-white text-black font-extrabold shadow-sm"
                            : resolvedTheme === "light"
                              ? "text-zinc-600 hover:text-zinc-900 font-medium"
                              : "text-zinc-400 hover:text-white font-medium"
                        }`}
                      >
                        {plan.plan_name} {totalStr && `(${totalStr})`}
                      </button>
                    )
                  })}
                </div>

                {/* Selected Dynamic Plan Details */}
                {(() => {
                  const currentPlan = dynamicBudgetData.plans[activePlanIdx] ?? dynamicBudgetData.plans[0]
                  const displayTotal = currentPlan.formatted_total ?? (currentPlan.total_budget ? `₹${currentPlan.total_budget.toLocaleString('en-IN')}` : "₹10 Lakh")
                  return (
                    <>
                      {/* Hero Financial Stat Card */}
                      <div className={`p-6 rounded-2xl border space-y-1 ${
                        resolvedTheme === "light" ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900/60 border-zinc-800"
                      }`}>
                        <span className={`text-[10px] font-semibold uppercase tracking-widest block ${
                          resolvedTheme === "light" ? "text-zinc-500" : "text-zinc-400"
                        }`}>
                          Total Estimated Production Budget
                        </span>
                        <div className="flex items-baseline gap-3">
                          <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight font-mono ${
                            resolvedTheme === "light" ? "text-zinc-900" : "text-white"
                          }`}>
                            {displayTotal}
                          </span>
                        </div>
                        <p className={`text-xs pt-1 ${resolvedTheme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                          {currentPlan.description}
                        </p>
                      </div>

                      {/* Department Breakdown Cards */}
                      {currentPlan.departments && currentPlan.departments.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-semibold uppercase tracking-wider ${
                              resolvedTheme === "light" ? "text-zinc-700" : "text-zinc-300"
                            }`}>
                              Department Allocation Breakdown
                            </h4>
                            <span className={`text-[10px] font-mono ${
                              resolvedTheme === "light" ? "text-zinc-500" : "text-zinc-400"
                            }`}>
                              {currentPlan.departments.length} Departments
                            </span>
                          </div>

                          <div className="space-y-2">
                            {currentPlan.departments.map((dept, idx) => {
                              const deptVal = dept.formatted_allocation ?? (dept.allocation ? `₹${dept.allocation.toLocaleString('en-IN')}` : "")
                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-xl border space-y-1 ${
                                    resolvedTheme === "light"
                                      ? "bg-zinc-50 border-zinc-200"
                                      : "bg-zinc-900/50 border-zinc-800"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className={`font-medium ${
                                      resolvedTheme === "light" ? "text-zinc-800" : "text-zinc-200"
                                    }`}>
                                      {dept.department}
                                    </span>
                                    <span className={`font-mono font-bold text-xs ${
                                      resolvedTheme === "light" ? "text-zinc-900" : "text-white"
                                    }`}>
                                      {deptVal}
                                    </span>
                                  </div>
                                  {dept.notes && (
                                    <p className={`text-[10px] leading-tight ${
                                      resolvedTheme === "light" ? "text-zinc-500" : "text-zinc-500"
                                    }`}>
                                      {dept.notes}
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {currentPlan.producer_notes && (
                        <div className={`text-[11px] italic p-3 rounded-xl border ${
                          resolvedTheme === "light"
                            ? "bg-zinc-100 text-zinc-600 border-zinc-200"
                            : "bg-zinc-900/30 text-zinc-400 border-zinc-800/50"
                        }`}>
                          <span className={`font-semibold not-italic ${
                            resolvedTheme === "light" ? "text-zinc-900" : "text-zinc-200"
                          }`}>
                            Producer Strategy:{" "}
                          </span>
                          {currentPlan.producer_notes}
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            ) : (
              <div className="py-12 text-center space-y-2">
                <p className={`text-xs ${resolvedTheme === "light" ? "text-zinc-500" : "text-zinc-400"}`}>
                  No budget generated for this film yet. Submit a prompt on the canvas to generate a custom line producer budget.
                </p>
              </div>
            )}

            {/* Apple Modal Footer */}
            <div className={`pt-3 flex items-center justify-between border-t ${
              resolvedTheme === "light" ? "border-zinc-200" : "border-zinc-800"
            }`}>
              <span className={`text-[11px] ${resolvedTheme === "light" ? "text-zinc-500" : "text-zinc-400"}`}>
                Calculated in Indian Rupees (₹ INR).
              </span>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                  resolvedTheme === "light"
                    ? "bg-zinc-950 text-white hover:bg-zinc-800"
                    : "bg-white text-black hover:bg-zinc-200"
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}


function createNode(
  id: string,
  batchId: string,
  kind: AgentKind,
  title: string,
  prompt: string,
  status: AgentNode["status"],
  x: number,
  y: number,
  startedAt: number,
  summary?: string,
  parentId?: string,
  isFollowUp = false,
): AgentNode {
  return { id, batchId, parentId, isFollowUp, kind, title, prompt, status, x, y, startedAt, summary, isManuallyPositioned: false }
}

function buildFollowUpPrompt(parent: AgentNode, followUp: string) {
  const context = parent.summary ?? parent.prompt
  return `Previous work:\n${context}\n\nFollow-up:\n${followUp}`
}

function createNodeId(kind: AgentKind) {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function titleForKind(kind: AgentKind) {
  if (kind === "script") return "Script Writer"
  if (kind === "casting") return "Casting Director"
  if (kind === "costume") return "Costume & Wardrobe"
  if (kind === "budget") return "Film Budget Producer"
  if (kind === "assets") return "Asset Scout"
  if (kind === "crew") return "Crew Recruiter"
  if (kind === "location") return "Location Scout"
  if (kind === "music") return "Music Director"
  return "Planner"
}

async function runAgentTask(
  kind: AgentKind,
  token: string,
  projectId: string,
  prompt: string,
  signal: AbortSignal,
  projectNodes: AgentNode[] = [],
  projectTitle?: string
) {
  if (kind === "script") {
    const result = await generateScript(token, projectId, prompt, signal)
    return result.content ?? result.scene_breakdown ?? result.ai_notes ?? `Script v${result.version} generated.`
  }
  if (kind === "casting") {
    const result = await createCastingCall(token, projectId, prompt, signal)
    return result.poster_text ?? `Casting call created for ${result.character_name}.`
  }
  if (kind === "assets") {
    const scriptNode = projectNodes.find((n) => n.kind === "script" && n.status === "done")
    const locationNode = projectNodes.find((n) => n.kind === "location" && n.status === "done")

    let contextualPrompt = prompt
    if (scriptNode?.summary) contextualPrompt += ` ${scriptNode.summary.slice(0, 120)}`
    if (locationNode?.summary) contextualPrompt += ` ${locationNode.summary.slice(0, 120)}`

    const isLoadMore = prompt.toLowerCase().includes("more") || prompt.toLowerCase().includes("load") || prompt.toLowerCase().includes("additional")
    const page = isLoadMore ? 2 : 1
    const limit = 3

    const results = await searchAgentAssets(token, projectId, contextualPrompt, limit, page, projectTitle, signal)
    if (results.length === 0) return "No matching assets were found for this story topic."

    const items = results.map((a) => ({
      title: a.title ?? "Stock Asset",
      url: a.source_url ?? "#",
      thumb: a.thumbnail_url ?? a.source_url ?? "",
      provider: a.source_provider ?? "Pixabay",
    }))

    return JSON.stringify({
      text: `Sourced ${results.length} royalty-free visual assets for "${projectTitle || "film"}" story topic via ${results[0]?.source_provider ?? "Pixabay"}:`,
      assets: items,
    })
  }
  if (kind === "crew") {
    const result = await createCrewPosting(token, projectId, prompt, signal)
    const posterText = result.poster_text ?? `Crew posting created for ${result.role_title}.`
    const crewPoster = createCrewPosterImage({
      title: result.role_title,
      department: result.department,
      location: result.location,
      isPaid: result.is_paid,
      isRemote: result.is_remote,
      compensation: result.compensation_notes,
      experienceLevel: result.experience_level,
      body: posterText,
      projectTitle,
    })

    return JSON.stringify({
      text: `Generated a crew recruitment poster for ${result.role_title}.`,
      crewPoster,
    })
  }
  if (kind === "location") {
    const result = await scoutLocations(token, projectId, prompt, signal)
    return result.scout_report ?? `Location scouting report generated for ${result.location_name}.`
  }
  if (kind === "music") {
    const isLoadMore = prompt.toLowerCase().includes("more") || prompt.toLowerCase().includes("load") || prompt.toLowerCase().includes("additional")
    const page = isLoadMore ? 2 : 1
    const limit = 3

    const results = await searchMusicTracks(token, projectId, prompt, limit, page, projectTitle, signal)
    if (results.length === 0) return "No soundtrack tracks were found for this topic."

    const items = results.map((t) => ({
      title: t.title ?? "Soundtrack Track",
      artist: t.artist ?? "Artist",
      album: t.album ?? "Original Score",
      preview: t.preview_url ?? "",
      url: t.deezer_url ?? "#",
      cover: t.cover_url ?? "",
    }))

    return JSON.stringify({
      text: `Sourced ${results.length} royalty-free soundtrack tracks for "${projectTitle || "film"}" topic via Jamendo:`,
      tracks: items,
    })
  }
  if (kind === "costume") {
    const result = await generateCostumePlans(token, projectId, prompt, signal)
    return typeof result === "string" ? result : (result as any).summary ?? "Costume & Wardrobe design generated."
  }
  if (kind === "budget") {
    const result = await generateFilmBudget(token, projectId, prompt, signal)
    return JSON.stringify({
      text: result.summary,
      budgetPlans: result.plans,
    })
  }
  return "Planning complete."
}


function runningSummaryForKind(kind: AgentKind) {
  if (kind === "costume") return "Designing character wardrobe & hero costumes in ₹..."
  if (kind === "budget") return "Computing full film production budget & department line-items in ₹..."
  if (kind === "assets") return "Searching Pixabay for photos matching script & location context..."
  if (kind === "music") return "Finding soundtrack tracks with playable previews..."
  if (kind === "crew") return "Generating crew posting copy and poster artwork..."
  if (kind === "location") return "Scouting practical locations and visual notes..."
  if (kind === "casting") return "Drafting casting materials..."
  if (kind === "script") return "Developing screenplay notes and scene structure..."
  return "Planning agent work..."
}

function createCrewPosterImage(input: {
  title: string
  department: string | null
  location: string | null
  isPaid: boolean
  isRemote: boolean
  compensation: string | null
  experienceLevel: string | null
  body: string
  projectTitle?: string
}) {
  const role = input.title || "Production Crew"
  const project = input.projectTitle || "Creo Studio"
  const department = truncatePosterText(input.department || "Production", 24)
  const location = truncatePosterText(input.isRemote ? "Remote" : input.location || "Location TBD", 26)
  const pay = truncatePosterText(input.isPaid ? input.compensation || "Paid role" : "Passion project", 26)
  const experience = input.experienceLevel ? `${toTitleCase(input.experienceLevel)} level` : "Film crew"
  const cleanBody = stripPosterMarkdown(input.body)
  const bodyLines = wrapPosterText(cleanBody, 52, 9)
  const titleLines = wrapPosterText(role.toUpperCase(), 21, 2)
  const fileName = `${slugify(role)}-crew-poster.png`
  const titleStartY = titleLines.length > 1 ? 405 : 430
  const titleNodes = titleLines.map((line, i) => `<text x="540" y="${titleStartY + i * 66}" class="role" text-anchor="middle">${escapeXml(line)}</text>`).join("")
  const textNodes = bodyLines.map((line, i) => `<text x="150" y="${690 + i * 34}" class="body">${escapeXml(line)}</text>`).join("")

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <clipPath id="paperClip">
      <path d="M72 32 C142 42 178 22 240 36 C305 51 348 22 410 36 C466 49 518 31 573 35 C635 39 688 51 748 34 C812 16 864 39 928 30 C968 24 994 28 1010 34 L1015 145 C994 174 1019 205 996 235 L1013 352 C988 390 1019 432 995 474 L1014 606 C984 650 1022 706 994 752 L1010 888 C980 940 1020 999 990 1046 L1010 1223 C933 1231 869 1218 796 1236 C727 1253 676 1226 612 1242 C540 1260 476 1229 414 1242 C334 1258 276 1229 201 1243 C143 1254 101 1242 70 1230 L57 1110 C83 1068 45 1019 72 974 L54 840 C85 794 45 744 72 696 L54 578 C82 530 45 480 73 434 L56 304 C85 263 45 211 73 166 Z"/>
    </clipPath>
    <radialGradient id="paperBase" cx="44%" cy="38%" r="78%">
      <stop offset="0" stop-color="#f7e6bd"/>
      <stop offset="0.58" stop-color="#e4bd78"/>
      <stop offset="1" stop-color="#b9782e"/>
    </radialGradient>
    <linearGradient id="paperShade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff5d0" stop-opacity="0.5"/>
      <stop offset="0.55" stop-color="#d79b4b" stop-opacity="0"/>
      <stop offset="1" stop-color="#5a3216" stop-opacity="0.28"/>
    </linearGradient>
    <filter id="softGrain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.08"/></feComponentTransfer>
    </filter>
    <style>
      .wanted{font:900 138px Georgia,'Times New Roman',serif;letter-spacing:16px;fill:#26180d}.role{font:900 58px Georgia,'Times New Roman',serif;letter-spacing:2px;fill:#26180d}.project{font:700 27px Georgia,'Times New Roman',serif;letter-spacing:5px;fill:#5a351b}.meta{font:700 27px Georgia,'Times New Roman',serif;fill:#26180d}.body{font:400 27px Georgia,'Times New Roman',serif;fill:#2d1c0f}.footer{font:700 25px Georgia,'Times New Roman',serif;letter-spacing:1px;fill:#26180d}
    </style>
  </defs>
  <rect width="1080" height="1350" fill="#2b1b10"/>
  <g clip-path="url(#paperClip)">
    <rect x="54" y="28" width="972" height="1218" fill="url(#paperBase)"/>
    <rect x="54" y="28" width="972" height="1218" fill="url(#paperShade)"/>
    <rect x="54" y="28" width="972" height="1218" fill="#7a461e" filter="url(#softGrain)" opacity="0.65"/>
    <rect x="54" y="28" width="972" height="1218" fill="none" stroke="#754514" stroke-width="20" opacity="0.12"/>
  </g>
  <text x="540" y="205" class="wanted" text-anchor="middle">WANTED</text>
  <line x1="160" y1="300" x2="430" y2="300" stroke="#26180d" stroke-width="6"/>
  <g transform="translate(540 294)" stroke="#26180d" fill="none" stroke-width="5" stroke-linecap="round"><path d="M-54 10 C-30 -18 -12 -18 0 8 C12 -18 30 -18 54 10"/><path d="M-74 16 C-42 38 -22 30 0 10 C22 30 42 38 74 16"/><path d="M-18 28 C-10 42 10 42 18 28"/><circle cx="-42" cy="7" r="7" fill="#26180d"/><circle cx="42" cy="7" r="7" fill="#26180d"/></g>
  <line x1="650" y1="300" x2="920" y2="300" stroke="#26180d" stroke-width="6"/>
  ${titleNodes}
  <text x="540" y="548" class="project" text-anchor="middle">${escapeXml(truncatePosterText(project.toUpperCase(), 34))}</text>
  <rect x="130" y="585" width="820" height="58" rx="4" fill="#26180d" opacity="0.1"/>
  <text x="540" y="623" class="meta" text-anchor="middle">${escapeXml(department)} / ${escapeXml(experience)}</text>
  ${textNodes}
  <line x1="140" y1="1068" x2="410" y2="1068" stroke="#26180d" stroke-width="6"/>
  <g transform="translate(540 1062)" stroke="#26180d" fill="none" stroke-width="5" stroke-linecap="round"><path d="M-54 10 C-30 -18 -12 -18 0 8 C12 -18 30 -18 54 10"/><path d="M-74 16 C-42 38 -22 30 0 10 C22 30 42 38 74 16"/><path d="M-18 28 C-10 42 10 42 18 28"/><circle cx="-42" cy="7" r="7" fill="#26180d"/><circle cx="42" cy="7" r="7" fill="#26180d"/></g>
  <line x1="670" y1="1068" x2="940" y2="1068" stroke="#26180d" stroke-width="6"/>
  <text x="540" y="1142" class="meta" text-anchor="middle">${escapeXml(location)} / ${escapeXml(pay)}</text>
  <text x="540" y="1208" class="footer" text-anchor="middle">Apply with reel, availability, and relevant credits.</text>
</svg>`

  return {
    title: role,
    imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    downloadName: fileName,
  }
}

function stripPosterMarkdown(value: string) {
  return value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+[*]\s+/g, " ")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function truncatePosterText(value: string, maxChars: number) {
  const clean = value.replace(/\s+/g, " ").trim()
  if (clean.length <= maxChars) return clean
  return `${clean.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function wrapPosterText(text: string, maxChars: number, maxLines: number) {
  const words = text.split(" ").filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
      if (lines.length === maxLines) break
    } else {
      current = next
    }
  }

  if (current && lines.length < maxLines) lines.push(current)
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[,.!?;:]*$/, "")}...`
  }
  return lines
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "crew-poster"
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default App

function loadProjectHistory(): ProjectHistoryState {
  try {
    const raw = localStorage.getItem(PROJECT_HISTORY_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ProjectHistoryState
    return parsed && typeof parsed === "object" ? normalizeProjectHistory(parsed) : {}
  } catch {
    return {}
  }
}

function persistProjectHistory(history: ProjectHistoryState) {
  localStorage.setItem(PROJECT_HISTORY_STORAGE_KEY, JSON.stringify(history))
}

function normalizeProjectHistory(history: ProjectHistoryState): ProjectHistoryState {
  return Object.fromEntries(
    Object.entries(history).map(([projectId, nodes]) => {
      let activeBatchId = ""
      const sortedNodes = [...nodes].sort((a, b) => a.startedAt - b.startedAt)
      const normalizedNodes = sortedNodes.map((node) => {
        if (node.batchId) {
          activeBatchId = node.batchId
          return { ...node, isManuallyPositioned: node.isManuallyPositioned ?? false }
        }
        if (node.kind === "planner") {
          activeBatchId = `legacy-${node.id}`
          return { ...node, batchId: activeBatchId, isManuallyPositioned: node.isManuallyPositioned ?? false }
        }
        return {
          ...node,
          batchId: activeBatchId || `legacy-${node.id}`,
          isManuallyPositioned: node.isManuallyPositioned ?? false,
        }
      })

      const plannerByBatch = Object.fromEntries(
        normalizedNodes
          .filter((node) => node.kind === "planner")
          .map((node) => [node.batchId, node.id])
      )

      const withParents = normalizedNodes.map((node) => {
        if (node.parentId || node.kind === "planner") return node
        return { ...node, parentId: plannerByBatch[node.batchId] }
      })

      return [projectId, withParents]
    })
  )
}
