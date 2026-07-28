import React, { useRef, useState, useLayoutEffect, useCallback, useEffect, useMemo } from "react"
import { Ban, CheckCircle2, Clock, FileText, Loader2, Search, Users, WandSparkles, XCircle } from "lucide-react"
import { type AgentKind, type AgentNode, type AgentNodeStatus } from "../types/agent"

interface AgentNodesOverlayProps {
  nodes: AgentNode[]
  onStopAgent: (id: string) => void
  onMoveNode: (id: string, x: number, y: number) => void
  zoom: number
}

// Min/max card width — grows with content up to max
const CARD_MIN_W = 260
const CARD_MAX_W = 700

const kindIcons: Record<AgentKind, React.ReactNode> = {
  planner: <WandSparkles className="w-4 h-4" />,
  script: <FileText className="w-4 h-4" />,
  casting: <Users className="w-4 h-4" />,
  assets: <Search className="w-4 h-4" />,
  crew: <Users className="w-4 h-4" />,
}

// Tracks actual rendered card size for arrow anchoring
type CardSize = { w: number; h: number }

export const AgentNodesOverlay: React.FC<AgentNodesOverlayProps> = ({ nodes, onStopAgent, onMoveNode, zoom }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 1920, h: 1080 })
  const [cardSizes, setCardSizes] = useState<Record<string, CardSize>>({})
  const zoomRef = useRef(zoom)
  const dragRef = useRef<{ nodeId: string; startMouseX: number; startMouseY: number; startNodeX: number; startNodeY: number } | null>(null)

  useLayoutEffect(() => { zoomRef.current = zoom }, [zoom])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setContainerSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: AgentNode) => {
    if ((e.target as HTMLElement).closest("button")) return
    e.stopPropagation()
    dragRef.current = { nodeId: node.id, startMouseX: e.clientX, startMouseY: e.clientY, startNodeX: node.x, startNodeY: node.y }

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      onMoveNode(d.nodeId, d.startNodeX + (ev.clientX - d.startMouseX) / zoomRef.current, d.startNodeY + (ev.clientY - d.startMouseY) / zoomRef.current)
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }, [onMoveNode])

  const planner = nodes.find((n) => n.kind === "planner")
  const workers = nodes.filter((n) => n.kind !== "planner")
  const ox = containerSize.w * 0.5
  const oy = containerSize.h * 0.45

  const GAP = 48
  const reflowedWorkerY = useMemo(() => {
    const result: Record<string, number> = {}
    if (workers.length === 0) return result
    const heights = workers.map((w) => cardSizes[w.id]?.h ?? 180)
    const totalH = heights.reduce((sum, h) => sum + h, 0) + GAP * (workers.length - 1)
    let cursor = (planner?.y ?? 0) - totalH / 2
    for (let i = 0; i < workers.length; i++) {
      result[workers[i].id] = cursor + heights[i] / 2
      cursor += heights[i] + GAP
    }
    return result
  }, [workers, cardSizes, planner?.y])

  if (nodes.length === 0) return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">

      {/* SVG arrows — left to right: planner right-center → worker left-center */}
      {planner && workers.length > 0 && (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
          <defs>
            {(["accent", "success", "danger", "muted"] as const).map((key) => (
              <marker key={key} id={`arr-${key}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" opacity="0.6"
                  fill={key === "success" ? "var(--t-success)" : key === "danger" ? "var(--t-danger)" : key === "muted" ? "var(--t-text-4)" : "var(--t-accent)"}
                />
              </marker>
            ))}
          </defs>

          {workers.map((worker) => {
            const ps = cardSizes[planner.id]
            const ws = cardSizes[worker.id]
            const pw = ps?.w ?? CARD_MIN_W

            // Use reflowed Y for arrows
            const workerY = reflowedWorkerY[worker.id] ?? worker.y

            // Planner right-center — use measured width + 8px breathing room
            const x1 = ox + planner.x + pw / 2 + 8
            const y1 = oy + planner.y

            // Worker left-center — use measured width + 8px breathing room
            const x2 = ox + worker.x - (ws?.w ?? CARD_MIN_W) / 2 - 8
            const y2 = oy + workerY

            // Horizontal cubic bezier
            const cx = (x1 + x2) / 2

            return (
              <path
                key={worker.id}
                d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={statusColor(worker.status)}
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray={worker.status === "queued" ? "5 4" : undefined}
                markerEnd={`url(#arr-${arrowKey(worker.status)})`}
              />
            )
          })}
        </svg>
      )}

      {/* Cards */}
      {nodes.map((node) => {
        const displayY = node.kind !== "planner" && reflowedWorkerY[node.id] !== undefined
          ? reflowedWorkerY[node.id]
          : node.y
        return (
          <NodeCard
            key={node.id}
            node={node}
            displayY={displayY}
            onStopAgent={onStopAgent}
            onMouseDown={handleNodeMouseDown}
            onSizeChange={(id, size) => setCardSizes((prev) => ({ ...prev, [id]: size }))}
          />
        )
      })}
    </div>
  )
}

interface NodeCardProps {
  node: AgentNode
  displayY: number
  onStopAgent: (id: string) => void
  onMouseDown: (e: React.MouseEvent, node: AgentNode) => void
  onSizeChange: (id: string, size: CardSize) => void
}

const NodeCard: React.FC<NodeCardProps> = ({ node, displayY, onStopAgent, onMouseDown, onSizeChange }) => {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      onSizeChange(node.id, { w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [node.id, onSizeChange])

  return (
    <div
      ref={cardRef}
      className="absolute rounded-2xl border shadow-2xl p-3 theme-transition"
      style={{
        minWidth: CARD_MIN_W,
        maxWidth: CARD_MAX_W,
        width: "max-content",
        left: `calc(50% + ${node.x}px)`,
        top: `calc(45% + ${displayY}px)`,
        transform: "translate(-50%, -50%)",
        backgroundColor: "var(--t-bg-panel)",
        borderColor: statusColor(node.status),
        color: "var(--t-text-1)",
        cursor: "grab",
        pointerEvents: "auto",
        userSelect: "none",
      }}
      onMouseDown={(e) => onMouseDown(e, node)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "var(--t-bg-elevated)", color: statusColor(node.status) }}
          >
            {kindIcons[node.kind]}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate">{node.title}</h3>
            <p className="text-[11px] capitalize" style={{ color: "var(--t-text-3)" }}>{node.kind} agent</p>
          </div>
        </div>

        {node.status === "running" && (
          <button
            onClick={() => onStopAgent(node.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            style={{ color: "var(--t-danger)", backgroundColor: "rgba(248,113,113,0.08)" }}
            title="Stop agent"
          >
            <Ban className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-3 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--t-text-2)" }}>
        {node.summary ?? node.prompt}
      </div>

      {node.error && (
        <div className="mt-2 text-[11px]" style={{ color: "var(--t-danger)" }}>{node.error}</div>
      )}

      {node.status === "running" && node.progress !== undefined && (
        <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--t-bg-elevated)" }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${node.progress}%`, backgroundColor: statusColor(node.status) }}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: "var(--t-text-4)" }}>
        <span className="flex items-center gap-1.5">
          {statusIcon(node.status)}
          {statusLabel(node.status)}
        </span>
        <span>{new Date(node.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>
  )
}

function arrowKey(status: AgentNodeStatus) {
  if (status === "done") return "success"
  if (status === "error" || status === "stopped") return "danger"
  if (status === "queued") return "muted"
  return "accent"
}

function statusColor(status: AgentNodeStatus) {
  if (status === "done") return "var(--t-success)"
  if (status === "error" || status === "stopped") return "var(--t-danger)"
  if (status === "queued") return "var(--t-text-4)"
  return "var(--t-accent)"
}

function statusIcon(status: AgentNodeStatus) {
  if (status === "done") return <CheckCircle2 className="w-3.5 h-3.5" />
  if (status === "error") return <XCircle className="w-3.5 h-3.5" />
  if (status === "stopped") return <Ban className="w-3.5 h-3.5" />
  if (status === "queued") return <Clock className="w-3.5 h-3.5" />
  return <Loader2 className="w-3.5 h-3.5 animate-spin" />
}

function statusLabel(status: AgentNodeStatus) {
  if (status === "done") return "Done"
  if (status === "error") return "Needs attention"
  if (status === "stopped") return "Stopped"
  if (status === "queued") return "Queued"
  return "Working"
}

export default AgentNodesOverlay
