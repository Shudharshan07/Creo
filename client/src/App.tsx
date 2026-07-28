import { useState, useRef, useCallback } from "react"
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
} from "./lib/api"
import { type AgentKind, type AgentNode } from "./types/agent"
import { type Project } from "./types/project"
import { LayoutGrid } from "lucide-react"

const ZOOM_STEP = 0.15
const MIN_ZOOM = 0.1
const MAX_ZOOM = 4

function App() {
  const [session, setSession] = useState(() => getStoredSession())
  const [viewMode, setViewMode] = useState<"studio" | "landing">("studio")
  const [zoom, setZoom] = useState(1)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [agentNodes, setAgentNodes] = useState<AgentNode[]>([])
  const canvasRef = useRef<InfiniteDotCanvasHandle>(null)
  const agentControllersRef = useRef(new Map<string, AbortController>())

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(2))))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, parseFloat((z - ZOOM_STEP).toFixed(2))))
  }, [])

  const handleZoomReset = useCallback(() => {
    canvasRef.current?.resetView()
  }, [])

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  const handleSignOut = useCallback(() => {
    for (const controller of agentControllersRef.current.values()) controller.abort()
    agentControllersRef.current.clear()
    clearSession()
    setSession({ token: null, email: null })
    setSelectedProject(null)
    setAgentNodes([])
  }, [])

  const batchCountRef = useRef(0)

  const updateAgentNode = useCallback((id: string, patch: Partial<AgentNode>) => {
    setAgentNodes((nodes) => nodes.map((node) => node.id === id ? { ...node, ...patch } : node))
  }, [])

  const stopAgent = useCallback((id: string) => {
    agentControllersRef.current.get(id)?.abort()
    agentControllersRef.current.delete(id)
    updateAgentNode(id, { status: "stopped", summary: "Stopped by you." })
  }, [updateAgentNode])

  const moveAgentNode = useCallback((id: string, x: number, y: number) => {
    setAgentNodes((nodes) => nodes.map((n) => n.id === id ? { ...n, x, y } : n))
  }, [])

  const runPrompt = useCallback((prompt: string) => {
    const project = selectedProject
    const token = session.token
    const startedAt = Date.now()
    const plannerId = createNodeId("planner")

    if (!project || !token) {
      setAgentNodes((nodes) => [
        ...nodes,
        createNode(plannerId, "planner", "Planner", prompt, "error", 0, -120, startedAt, "Create or select a project before sending agent work."),
      ])
      return
    }

    // Each new batch offsets diagonally so it doesn't stack on the previous one
    const batch = batchCountRef.current++
    const bx = batch * 200
    const by = batch * 380

    const workerKinds: AgentKind[] = ["script", "casting", "assets", "crew"]
    const plannerSummary = `Dispatching ${workerKinds.length} agents in parallel for "${project.title}".`
    // Generous initial spacing — overlay will reflow based on actual heights
    const workerSpacing = 500

    // Left-to-right: planner on the left, workers stacked to the right
    // Workers sit 600px to the right of the planner center — real gap handled by overlay
    const newNodes: AgentNode[] = [
      createNode(plannerId, "planner", "Planner", prompt, "done", bx - 420, by, startedAt, plannerSummary),
      ...workerKinds.map((kind, i) =>
        createNode(
          createNodeId(kind),
          kind,
          titleForKind(kind),
          prompt,
          "queued",
          bx + 280,
          by + (i - (workerKinds.length - 1) / 2) * workerSpacing,
          startedAt + i,
        )
      ),
    ]

    setAgentNodes((nodes) => [...nodes.slice(-20), ...newNodes])

    // Stagger worker start by 400ms each so you see them light up sequentially
    const workers = newNodes.filter((n) => n.kind !== "planner")
    workers.forEach((node, i) => {
      setTimeout(() => {
        const controller = new AbortController()
        agentControllersRef.current.set(node.id, controller)
        updateAgentNode(node.id, { status: "running", summary: `Working on: ${prompt}`, progress: 0 })

        // Fake incremental progress ticks while the real task runs
        const progressInterval = setInterval(() => {
          setAgentNodes((nodes) =>
            nodes.map((n) => {
              if (n.id !== node.id || n.status !== "running") return n
              const next = Math.min((n.progress ?? 0) + Math.random() * 18, 90)
              return { ...n, progress: next }
            })
          )
        }, 800)

        runAgentTask(node.kind, token, project.id, prompt, controller.signal)
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
            clearInterval(progressInterval)
            agentControllersRef.current.delete(node.id)
          })
      }, i * 400)
    })
  }, [selectedProject, session.token, updateAgentNode])

  if (!session.token) {
    return <AuthGate onAuthenticated={(token, email) => setSession({ token, email })} />
  }

  if (viewMode === "landing") {
    return <LandingPage onEnterStudio={() => setViewMode("studio")} />
  }

  return (
    <main
      className="relative w-screen h-screen m-0 p-0 overflow-hidden select-none theme-transition"
      style={{ backgroundColor: "var(--t-bg-page)" }}
    >
      <div className="absolute top-6 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          <ProjectsOverlay token={session.token} onSelectProject={setSelectedProject} />
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
      />

      <BottomBar
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onFullscreen={handleFullscreen}
        onHome={handleZoomReset}
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
  kind: AgentKind,
  title: string,
  prompt: string,
  status: AgentNode["status"],
  x: number,
  y: number,
  startedAt: number,
  summary?: string,
): AgentNode {
  return { id, kind, title, prompt, status, x, y, startedAt, summary }
}

function createNodeId(kind: AgentKind) {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function titleForKind(kind: AgentKind) {
  if (kind === "script") return "Script Writer"
  if (kind === "casting") return "Casting Director"
  if (kind === "assets") return "Asset Scout"
  if (kind === "crew") return "Crew Recruiter"
  return "Planner"
}

async function runAgentTask(kind: AgentKind, token: string, projectId: string, prompt: string, signal: AbortSignal) {
  if (kind === "script") {
    const result = await generateScript(token, projectId, prompt, signal)
    return result.ai_notes ?? result.scene_breakdown ?? result.content ?? `Script v${result.version} generated.`
  }
  if (kind === "casting") {
    const result = await createCastingCall(token, projectId, prompt, signal)
    return result.poster_text ?? `Casting call created for ${result.character_name}.`
  }
  if (kind === "assets") {
    const results = await searchAgentAssets(token, projectId, prompt, signal)
    return results.length > 0 ? `Found and saved ${results.length} assets.` : "No matching assets were found."
  }
  if (kind === "crew") {
    const result = await createCrewPosting(token, projectId, prompt, signal)
    return result.poster_text ?? `Crew posting created for ${result.role_title}.`
  }
  return "Planning complete."
}



export default App