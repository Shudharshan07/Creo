export interface Project {
  id: string
  title: string
  genre?: string | null
  logline?: string | null
  status?: string
  updatedAt: string
  category: "recent" | "thisYear" | "examples"
  deviceType: "desktop" | "mobile"
  isShared?: boolean
  thumbnailUrl: string
}

export interface ServerProject {
  id: string
  owner_id: string
  title: string
  genre: string | null
  logline: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface ProjectCreateInput {
  title: string
  genre?: string | null
  logline?: string | null
}