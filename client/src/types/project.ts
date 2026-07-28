export interface Project {
  id: string
  title: string
  updatedAt: string
  category: "recent" | "thisYear" | "examples"
  deviceType: "desktop" | "mobile"
  isShared?: boolean
  thumbnailUrl: string
}
