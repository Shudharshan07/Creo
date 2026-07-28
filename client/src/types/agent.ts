export type AgentNodeStatus = "queued" | "running" | "done" | "error" | "stopped"
export type AgentKind = "planner" | "script" | "casting" | "assets" | "crew"

export interface AgentNode {
  id: string
  batchId: string
  parentId?: string
  isFollowUp?: boolean
  kind: AgentKind
  isManuallyPositioned?: boolean
  title: string
  prompt: string
  status: AgentNodeStatus
  x: number
  y: number
  startedAt: number
  summary?: string
  error?: string
  progress?: number // 0–100
}
