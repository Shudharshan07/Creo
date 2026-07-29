import { useState, useRef, useCallback, useEffect } from "react"
import InfiniteDotCanvas, { type InfiniteDotCanvasHandle } from "./components/InfiniteDotCanvas"
import ProjectsOverlay from "./components/ProjectsOverlay"
import ProfileButton from "./components/ProfileButton"
import BottomBar from "./components/BottomBar"
import AccountSettingsModal from "./components/AccountSettingsModal"
import { LandingPage } from "./components/LandingPage"
import AuthGate from "./components/AuthGate"
import {
  clearSession,
  createCastingCall,
  createCrewPosting,
  generateScript,
  getStoredSession,
  searchAgentAssets,
  scoutLocations,
  searchMusicTracks,
} from "./lib/api"
import { type AgentKind, type AgentNode } from "./types/agent"
import { type Project } from "./types/project"
import { LayoutGrid } from "lucide-react"

const PROJECT_HISTORY_STORAGE_KEY = "movie_agent_project_history"
const CHILD_NODE_X_OFFSET = 320

type ProjectHistoryState = Record<string, AgentNode[]>

function App() {
  const [session, setSession] = useState(() => getStoredSession())
  const [viewMode, setViewMode] = useState<"landing" | "login" | "studio">("landing")
  const [zoom, setZoom] = useState(1)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [agentNodes, setAgentNodes] = useState<AgentNode[]>([])
  const [projectHistory, setProjectHistory] = useState<ProjectHistoryState>(() => loadProjectHistory())
  const canvasRef = useRef<InfiniteDotCanvasHandle>(null)
  const agentControllersRef = useRef(new Map<string, AbortController>())
  const agentTimeoutsRef = useRef(new Map<string, number>())
  const currentProjectNodes = selectedProject ? projectHistory[selectedProject.id] ?? [] : []

  const projectHistoryRef = useRef(projectHistory)
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
        summary: `Searching Pixabay for photos matching script & location context...`,
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
      const workerKinds: AgentKind[] = ["script", "casting", "location", "music", "crew", "assets"]
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

    const workerKinds: AgentKind[] = ["script", "casting", "location", "music", "crew", "assets"]
    const plannerSummary = `Dispatching ${workerKinds.length} agents in parallel for "${project.title}".`
    // Generous initial spacing — overlay will reflow based on actual heights
    const workerSpacing = 500

    // Left-to-right: planner on the left, workers stacked to the right
    // Workers sit 600px to the right of the planner center — real gap handled by overlay
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
            onClick={() => setViewMode("landing")}
            className="flex items-center gap-2 border px-3 py-2 rounded-2xl shadow-xl transition-colors cursor-pointer font-semibold text-xs theme-transition"
            style={{
              backgroundColor: "var(--t-bg-elevated)",
              borderColor: "var(--t-border)",
              color: "var(--t-text-2)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--t-bg-hover)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--t-bg-elevated)" }}
            title="Landing Page Overview"
          >
            <LayoutGrid className="w-3.5 h-3.5" style={{ color: "var(--t-accent)" }} />
            <span className="hidden sm:inline">Landing Page</span>
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
    return result.ai_notes ?? result.scene_breakdown ?? result.content ?? `Script v${result.version} generated.`
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
    return result.poster_text ?? `Crew posting created for ${result.role_title}.`
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
  return "Planning complete."
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
