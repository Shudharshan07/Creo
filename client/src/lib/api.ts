import { type Project, type ProjectCreateInput, type ProjectUpdateInput, type ServerProject } from "../types/project"

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api"
const TOKEN_STORAGE_KEY = "movie_agent_access_token"
const USER_STORAGE_KEY = "movie_agent_user_email"

interface TokenResponse {
  access_token: string
  token_type: string
}

interface RegisterInput {
  email: string
  password: string
  fullName?: string
}

interface LoginInput {
  email: string
  password: string
}

export interface ScriptResult {
  id: string
  version: number
  content: string | null
  scene_breakdown: string | null
  characters: string | null
  ai_notes: string | null
}

export interface CastingResult {
  id: string
  character_name: string
  poster_text: string | null
}

export interface AssetResult {
  id: string
  asset_type: string
  title: string | null
  source_url?: string | null
  thumbnail_url?: string | null
  source_provider: string | null
}

export interface CrewResult {
  id: string
  role_title: string
  poster_text: string | null
}

export interface LocationResult {
  id: string
  location_name: string
  scout_report: string | null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body = await response.json() as { detail?: string }
      message = body.detail ?? message
    } catch {
      // Keep the status message when the response is not JSON.
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return await response.json() as T
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export function getStoredSession() {
  return {
    token: localStorage.getItem(TOKEN_STORAGE_KEY),
    email: localStorage.getItem(USER_STORAGE_KEY),
  }
}

export function storeSession(token: string, email: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  localStorage.setItem(USER_STORAGE_KEY, email)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(USER_STORAGE_KEY)
}

export async function registerUser({ email, password, fullName }: RegisterInput) {
  await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      full_name: fullName || null,
      role: "director",
    }),
  })
}

export async function loginUser({ email, password }: LoginInput) {
  const token = await request<TokenResponse>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      username: email,
      password,
    }),
  })
  return token.access_token
}

export async function listProjects(token: string): Promise<Project[]> {
  const projects = await request<ServerProject[]>("/projects", {
    headers: authHeaders(token),
  })
  return projects.map(toClientProject)
}

export async function createProject(token: string, input: ProjectCreateInput): Promise<Project> {
  const project = await request<ServerProject>("/projects", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  })
  return toClientProject(project)
}

export async function updateProject(token: string, projectId: string, input: ProjectUpdateInput): Promise<Project> {
  const project = await request<ServerProject>(`/projects/${projectId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  })
  return toClientProject(project)
}

export async function deleteProject(token: string, projectId: string): Promise<void> {
  await request<void>(`/projects/${projectId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  })
}

export async function generateScript(token: string, projectId: string, prompt: string, signal?: AbortSignal) {
  return await request<ScriptResult>(`/projects/${projectId}/scripts/generate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ prompt }),
    signal,
  })
}

export async function createCastingCall(token: string, projectId: string, prompt: string, signal?: AbortSignal) {
  return await request<CastingResult>(`/projects/${projectId}/casting`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      character_name: inferNamedValue(prompt, "character") ?? "Lead Role",
      role_description: prompt,
      requirements: "Generated from the studio prompt.",
      audition_format: "self-tape",
      is_paid: true,
    }),
    signal,
  })
}

export async function searchAgentAssets(token: string, projectId: string, prompt: string, limit = 3, signal?: AbortSignal) {
  return await request<AssetResult[]>(`/projects/${projectId}/assets/search`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      query: prompt,
      asset_type: inferAssetType(prompt),
      limit: limit,
    }),
    signal,
  })
}

export async function createCrewPosting(token: string, projectId: string, prompt: string, signal?: AbortSignal) {
  return await request<CrewResult>(`/projects/${projectId}/crew`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      role_title: inferNamedValue(prompt, "role") ?? "Production Crew",
      department: inferDepartment(prompt),
      description: prompt,
      requirements: "Generated from the studio prompt.",
      experience_level: "mid",
      is_paid: true,
      is_remote: false,
    }),
    signal,
  })
}

export async function scoutLocations(token: string, projectId: string, prompt: string, signal?: AbortSignal) {
  return await request<LocationResult>(`/projects/${projectId}/locations/scout`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      location_name: prompt.slice(0, 40) || "Shooting Location",
      location_type: "Architectural / Outdoor",
      visual_description: prompt,
    }),
    signal,
  })
}

function toClientProject(project: ServerProject): Project {
  return {
    id: project.id,
    title: project.title,
    genre: project.genre,
    logline: project.logline,
    status: project.status,
    updatedAt: formatDate(project.updated_at),
    category: project.created_at.startsWith(new Date().getFullYear().toString()) ? "thisYear" : "recent",
    deviceType: "desktop",
    thumbnailUrl: projectThumbnail(project.title, project.genre),
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function projectThumbnail(title: string, genre: string | null) {
  const initials = encodeURIComponent(
    title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "MA"
  )
  const subtitle = encodeURIComponent(genre ?? "Film")

  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%2318191c'/><circle cx='50' cy='42' r='22' fill='%23c8f135'/><text x='50' y='49' font-size='20' text-anchor='middle' font-family='Arial' font-weight='700' fill='%23000000'>${initials}</text><text x='50' y='78' font-size='10' text-anchor='middle' font-family='Arial' fill='%23cbd5e1'>${subtitle}</text></svg>`
}

function inferAssetType(prompt: string) {
  const text = prompt.toLowerCase()
  if (text.includes("video") || text.includes("clip") || text.includes("footage")) return "video"
  if (text.includes("audio") || text.includes("sound") || text.includes("music")) return "audio"
  return "image"
}

function inferDepartment(prompt: string) {
  const text = prompt.toLowerCase()
  if (text.includes("camera") || text.includes("cinematographer") || text.includes("dop")) return "camera"
  if (text.includes("sound") || text.includes("audio")) return "sound"
  if (text.includes("edit") || text.includes("post")) return "post-production"
  if (text.includes("art") || text.includes("production design")) return "art"
  return "production"
}

function inferNamedValue(prompt: string, label: "character" | "role") {
  const expression = label === "character"
    ? /(?:character|role)\s+(?:named|called|for)?\s*([A-Z][\w\s-]{1,40})/
    : /(?:hire|find|post(?:ing)?\s+for|need)\s+(?:a|an)?\s*([A-Za-z][\w\s-]{2,40})/
  return prompt.match(expression)?.[1]?.trim()
}
