import React, { useRef, useState, useLayoutEffect, useCallback, useEffect, useMemo } from "react"
import { Ban, CheckCircle2, Clock, Ellipsis, FilePenLine, FileText, Loader2, MessageCircle, Search, Trash2, Users, WandSparkles, XCircle } from "lucide-react"
import { type AgentKind, type AgentNode, type AgentNodeStatus } from "../types/agent"

interface AgentNodesOverlayProps {
  nodes: AgentNode[]
  onStopAgent: (id: string) => void
  onMoveNode: (id: string, x: number, y: number) => void
  onEditBatchPrompt: (batchId: string, prompt: string) => void
  onDeleteBatch: (batchId: string) => void
  onMessageAgent: (id: string, message: string) => void
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

export const AgentNodesOverlay: React.FC<AgentNodesOverlayProps> = ({
  nodes,
  onStopAgent,
  onMoveNode,
  onEditBatchPrompt,
  onDeleteBatch,
  onMessageAgent,
  zoom,
}) => {
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

  const ox = containerSize.w * 0.5
  const oy = containerSize.h * 0.45

  const childrenByParent = useMemo(() => {
    const map: Record<string, AgentNode[]> = {}
    for (const node of nodes) {
      if (!node.parentId) continue
      if (!map[node.parentId]) map[node.parentId] = []
      map[node.parentId].push(node)
    }
    for (const children of Object.values(map)) {
      children.sort((a, b) => a.startedAt - b.startedAt)
    }
    return map
  }, [nodes])

  const GAP = 48
  const reflowedY = useMemo(() => {
    const result: Record<string, number> = {}

    const reflowChildren = (parentId: string, parentY: number) => {
      const children = (childrenByParent[parentId] ?? []).filter((child) => !child.isManuallyPositioned)
      if (children.length === 0) return

      const heights = children.map((child) => cardSizes[child.id]?.h ?? 180)
      const totalH = heights.reduce((sum, height) => sum + height, 0) + GAP * (children.length - 1)
      let cursor = parentY - totalH / 2

      for (let i = 0; i < children.length; i++) {
        const childY = cursor + heights[i] / 2
        result[children[i].id] = childY
        cursor += heights[i] + GAP
        reflowChildren(children[i].id, childY)
      }
    }

    for (const node of nodes) {
      if ((childrenByParent[node.id]?.length ?? 0) > 0) {
        reflowChildren(node.id, result[node.id] ?? node.y)
      }
    }

    return result
  }, [nodes, childrenByParent, cardSizes])

  const getDisplayY = useCallback((node: AgentNode) => {
    if (!node.isManuallyPositioned && reflowedY[node.id] !== undefined) {
      return reflowedY[node.id]
    }
    return node.y
  }, [reflowedY])

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: AgentNode) => {
    if ((e.target as HTMLElement).closest("button, textarea, input")) return
    e.stopPropagation()
    dragRef.current = {
      nodeId: node.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: node.x,
      startNodeY: getDisplayY(node),
    }

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
  }, [onMoveNode, getDisplayY])

  if (nodes.length === 0) return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">

      {/* SVG arrows — parent right-center → child left-center */}
      {nodes.some((node) => node.parentId) && (
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

          {nodes.flatMap((child) => {
            if (!child.parentId) return []
            const parent = nodes.find((node) => node.id === child.parentId)
            if (!parent) return []

            const ps = cardSizes[parent.id]
            const ws = cardSizes[child.id]
            const pw = ps?.w ?? CARD_MIN_W
            const parentY = getDisplayY(parent)
            const childY = getDisplayY(child)
            const x1 = ox + parent.x + pw / 2 + 8
            const y1 = oy + parentY
            const x2 = ox + child.x - (ws?.w ?? CARD_MIN_W) / 2 - 8
            const y2 = oy + childY
            const cx = (x1 + x2) / 2

            return [
              <path
                key={child.id}
                d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={statusColor(child.status)}
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray={child.status === "queued" ? "5 4" : undefined}
                markerEnd={`url(#arr-${arrowKey(child.status)})`}
              />,
            ]
          })}
        </svg>
      )}

      {/* Cards */}
      {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            displayY={getDisplayY(node)}
            onStopAgent={onStopAgent}
            onEditBatchPrompt={onEditBatchPrompt}
            onDeleteBatch={onDeleteBatch}
            onMessageAgent={onMessageAgent}
            onMouseDown={handleNodeMouseDown}
            onSizeChange={(id, size) => setCardSizes((prev) => ({ ...prev, [id]: size }))}
          />
      ))}
    </div>
  )
}

interface NodeCardProps {
  node: AgentNode
  displayY: number
  onStopAgent: (id: string) => void
  onEditBatchPrompt: (batchId: string, prompt: string) => void
  onDeleteBatch: (batchId: string) => void
  onMessageAgent: (id: string, message: string) => void
  onMouseDown: (e: React.MouseEvent, node: AgentNode) => void
  onSizeChange: (id: string, size: CardSize) => void
}

const NodeCard: React.FC<NodeCardProps> = ({
  node,
  displayY,
  onStopAgent,
  onEditBatchPrompt,
  onDeleteBatch,
  onMessageAgent,
  onMouseDown,
  onSizeChange,
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const messageRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMessageOpen, setIsMessageOpen] = useState(false)
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState(node.prompt)
  const [draftMessage, setDraftMessage] = useState("")

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

  useEffect(() => {
    setDraftPrompt(node.prompt)
  }, [node.prompt])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
      if (messageRef.current && !messageRef.current.contains(event.target as Node)) {
        setIsMessageOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSendMessage = useCallback(() => {
    const nextMessage = draftMessage.trim()
    if (!nextMessage) return
    onMessageAgent(node.id, nextMessage)
    setDraftMessage("")
    setIsMessageOpen(false)
  }, [draftMessage, node.id, onMessageAgent])

  const handleSavePrompt = useCallback(() => {
    const nextPrompt = draftPrompt.trim()
    if (!nextPrompt) return
    onEditBatchPrompt(node.batchId, nextPrompt)
    setIsEditingPrompt(false)
    setIsMenuOpen(false)
  }, [draftPrompt, node.batchId, onEditBatchPrompt])

  const handleDeleteBatch = useCallback(() => {
    const shouldDelete = window.confirm("Delete this prompt and all nodes created from it?")
    if (!shouldDelete) return
    onDeleteBatch(node.batchId)
    setIsMenuOpen(false)
  }, [node.batchId, onDeleteBatch])

  const bodyText = node.kind === "planner"
    ? node.summary
    : node.isFollowUp
      ? (node.summary ?? "Waiting to start...")
      : (node.summary ?? node.prompt)

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

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative" ref={messageRef}>
            <button
              onClick={() => setIsMessageOpen((open) => !open)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                color: isMessageOpen ? "var(--t-accent)" : "var(--t-text-3)",
                backgroundColor: isMessageOpen ? "rgba(200,241,53,0.1)" : "transparent",
              }}
              title="Tell this agent to do more"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            {isMessageOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl p-3 z-20 theme-transition"
                style={{
                  backgroundColor: "var(--t-bg-elevated)",
                  border: "1px solid var(--t-border)",
                }}
              >
                <label className="block text-[11px] font-semibold mb-2" style={{ color: "var(--t-text-3)" }}>
                  Follow-up instruction
                </label>
                <textarea
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  rows={3}
                  placeholder="Ask this agent to refine, expand, or try something else..."
                  className="w-full rounded-xl px-3 py-2 text-xs outline-none resize-none theme-transition"
                  style={{
                    backgroundColor: "var(--t-bg-input)",
                    border: "1px solid var(--t-border)",
                    color: "var(--t-text-1)",
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setDraftMessage("")
                      setIsMessageOpen(false)
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={{ color: "var(--t-text-2)", backgroundColor: "transparent" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!draftMessage.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-60"
                    style={{ color: "var(--t-accent-fg)", backgroundColor: "var(--t-accent)" }}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>

          {node.kind === "planner" && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen((open) => !open)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "var(--t-text-3)" }}
                title="Prompt actions"
              >
                <Ellipsis className="w-4 h-4" />
              </button>
              {isMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-44 rounded-2xl shadow-2xl py-1.5 text-xs z-20 theme-transition"
                  style={{
                    backgroundColor: "var(--t-bg-elevated)",
                    border: "1px solid var(--t-border)",
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      setDraftPrompt(node.prompt)
                      setIsEditingPrompt(true)
                      setIsMenuOpen(false)
                    }}
                    icon={<FilePenLine className="w-4 h-4" />}
                    label="Edit prompt"
                  />
                  <MenuItem
                    onClick={handleDeleteBatch}
                    icon={<Trash2 className="w-4 h-4" />}
                    label="Delete prompt"
                    danger
                  />
                </div>
              )}
            </div>
          )}

          {node.status === "running" && (
            <button
              onClick={() => onStopAgent(node.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "var(--t-danger)", backgroundColor: "rgba(248,113,113,0.08)" }}
              title="Stop agent"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--t-text-2)" }}>
        {bodyText}
      </div>

      {node.isFollowUp && (
        <div className="mt-2 rounded-xl px-3 py-2 text-xs whitespace-pre-wrap" style={{ backgroundColor: "var(--t-bg-elevated)", color: "var(--t-text-2)" }}>
          <span className="font-semibold" style={{ color: "var(--t-text-3)" }}>Follow-up</span>
          {"\n"}
          {node.prompt}
        </div>
      )}

      {node.kind === "planner" && (
        <div className="mt-2 rounded-xl px-3 py-2 text-xs whitespace-pre-wrap" style={{ backgroundColor: "var(--t-bg-elevated)", color: "var(--t-text-2)" }}>
          <span className="font-semibold" style={{ color: "var(--t-text-3)" }}>Prompt</span>
          {"\n"}
          {node.prompt}
        </div>
      )}

      {node.kind === "planner" && isEditingPrompt && (
        <div className="mt-3 rounded-2xl border p-3" style={{ borderColor: "var(--t-border)", backgroundColor: "var(--t-bg-elevated)" }}>
          <label className="block text-[11px] font-semibold mb-2" style={{ color: "var(--t-text-3)" }}>
            Edit Prompt
          </label>
          <textarea
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            rows={4}
            className="w-full rounded-xl px-3 py-2 text-xs outline-none resize-none theme-transition"
            style={{
              backgroundColor: "var(--t-bg-input)",
              border: "1px solid var(--t-border)",
              color: "var(--t-text-1)",
            }}
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setDraftPrompt(node.prompt)
                setIsEditingPrompt(false)
              }}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: "var(--t-text-2)", backgroundColor: "transparent" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSavePrompt}
              disabled={!draftPrompt.trim()}
              className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-60"
              style={{ color: "var(--t-accent-fg)", backgroundColor: "var(--t-accent)" }}
            >
              Save
            </button>
          </div>
        </div>
      )}

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

const MenuItem: React.FC<{
  onClick: () => void
  icon: React.ReactNode
  label: string
  danger?: boolean
}> = ({ onClick, icon, label, danger = false }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors"
    style={{ color: danger ? "var(--t-danger)" : "var(--t-text-2)" }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.backgroundColor = danger
        ? "rgba(248,113,113,0.08)"
        : "var(--t-bg-hover)"
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"
    }}
  >
    {icon}
    <span>{label}</span>
  </button>
)

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
