import React, { useState, useMemo, memo, useCallback, useEffect } from "react"
import { type Project } from "../types/project"
import { createProject, listProjects } from "../lib/api"
import { FolderKanban, Loader2, Plus, X } from "lucide-react"

interface ProjectsOverlayProps {
  token: string
  onSelectProject?: (project: Project) => void
}

export const ProjectsOverlay: React.FC<ProjectsOverlayProps> = ({ token, onSelectProject }) => {
  const [isOpen, setIsOpen] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [projectsList, setProjectsList] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newGenre, setNewGenre] = useState("")

  useEffect(() => {
    let isActive = true
    setIsLoading(true)
    setError(null)

    listProjects(token)
      .then((projects) => {
        if (!isActive) return
        setProjectsList(projects)
        setSelectedProjectId((current) => current || projects[0]?.id || "")
      })
      .catch((err) => {
        if (!isActive) return
        setError(err instanceof Error ? err.message : "Unable to load projects")
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [token])

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return projectsList
    return projectsList.filter((p) => p.title.toLowerCase().includes(query))
  }, [projectsList, searchQuery])

  const recentProjects = useMemo(
    () => filteredProjects.filter((p) => p.category === "recent"),
    [filteredProjects]
  )
  const thisYearProjects = useMemo(
    () => filteredProjects.filter((p) => p.category === "thisYear"),
    [filteredProjects]
  )
  const examplesProjects = useMemo(
    () => filteredProjects.filter((p) => p.category === "examples"),
    [filteredProjects]
  )

  const handleSelect = useCallback((project: Project) => {
    setSelectedProjectId(project.id)
    onSelectProject?.(project)
  }, [onSelectProject])

  const handleCreateProject = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return

    setIsCreating(true)
    setError(null)
    try {
      const project = await createProject(token, {
        title,
        genre: newGenre.trim() || null,
      })
      setProjectsList((projects) => [project, ...projects])
      setSelectedProjectId(project.id)
      setNewTitle("")
      setNewGenre("")
      onSelectProject?.(project)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create project")
    } finally {
      setIsCreating(false)
    }
  }, [newGenre, newTitle, onSelectProject, token])

  return (
    <div className="relative z-40">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border px-4 py-2 rounded-2xl shadow-xl transition-colors cursor-pointer font-semibold text-sm theme-transition"
        style={{
          backgroundColor: "var(--t-bg-elevated)",
          borderColor: "var(--t-border)",
          color: "var(--t-text-1)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--t-bg-hover)" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--t-bg-elevated)" }}
      >
        <FolderKanban className="w-4 h-4" style={{ color: "var(--t-accent)" }} />
        <span>My Projects</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "var(--t-text-3)" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute top-12 left-0 w-80 sm:w-96 max-h-[80vh] rounded-3xl shadow-2xl p-5 overflow-y-auto custom-scrollbar overscroll-contain theme-transition"
          style={{
            backgroundColor: "var(--t-bg-panel)",
            border: "1px solid var(--t-border)",
            willChange: "transform",
          }}
        >
          {/* Search */}
          <div className="relative mb-5">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: "var(--t-text-3)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects"
              className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm outline-none focus:ring-2 transition-colors theme-transition"
              style={{
                backgroundColor: "var(--t-bg-input)",
                border: "1px solid var(--t-border)",
                color: "var(--t-text-1)",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs theme-transition"
                style={{ color: "var(--t-text-3)" }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <form onSubmit={handleCreateProject} className="mb-5 space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New film project"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus:ring-2 transition-colors theme-transition"
              style={{
                backgroundColor: "var(--t-bg-input)",
                border: "1px solid var(--t-border)",
                color: "var(--t-text-1)",
              }}
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                placeholder="Genre"
                className="min-w-0 flex-1 px-3.5 py-2 rounded-xl text-xs outline-none focus:ring-2 transition-colors theme-transition"
                style={{
                  backgroundColor: "var(--t-bg-input)",
                  border: "1px solid var(--t-border)",
                  color: "var(--t-text-1)",
                }}
              />
              <button
                type="submit"
                disabled={isCreating || !newTitle.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-60"
                style={{ backgroundColor: "var(--t-accent)", color: "var(--t-accent-fg)" }}
                title="Create project"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {error && (
            <div
              className="rounded-xl px-3 py-2 text-xs mb-4"
              style={{ color: "var(--t-danger)", backgroundColor: "rgba(248,113,113,0.08)" }}
            >
              {error}
            </div>
          )}

          {/* Sections */}
          <div className="space-y-6">
            {isLoading && (
              <div className="py-8 flex items-center justify-center gap-2 text-xs" style={{ color: "var(--t-text-3)" }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading projects
              </div>
            )}
            {recentProjects.length > 0 && (
              <ProjectGroupSection
                title="Recent"
                projects={recentProjects}
                selectedProjectId={selectedProjectId}
                onSelect={handleSelect}
              />
            )}
            {thisYearProjects.length > 0 && (
              <ProjectGroupSection
                title="This Year"
                projects={thisYearProjects}
                selectedProjectId={selectedProjectId}
                onSelect={handleSelect}
              />
            )}
            {examplesProjects.length > 0 && (
              <ProjectGroupSection
                title="Examples"
                projects={examplesProjects}
                selectedProjectId={selectedProjectId}
                onSelect={handleSelect}
              />
            )}
            {!isLoading && filteredProjects.length === 0 && (
              <div className="py-8 text-center text-xs" style={{ color: "var(--t-text-4)" }}>
                {searchQuery ? `No projects found matching "${searchQuery}"` : "No projects yet"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ProjectGroupSectionProps {
  title: string
  projects: Project[]
  selectedProjectId: string
  onSelect: (project: Project) => void
}

const ProjectGroupSection: React.FC<ProjectGroupSectionProps> = memo(({
  title,
  projects,
  selectedProjectId,
  onSelect,
}) => {
  return (
    <div>
      <h3 className="font-bold text-sm tracking-wide mb-3" style={{ color: "var(--t-text-2)" }}>
        {title}
      </h3>
      <div className="space-y-2.5">
        {projects.map((project) => {
          const isSelected = project.id === selectedProjectId
          return (
            <div
              key={project.id}
              onClick={() => onSelect(project)}
              className="flex items-center gap-3.5 p-2.5 rounded-2xl transition-colors duration-150 cursor-pointer theme-transition"
              style={{
                backgroundColor: isSelected ? "var(--t-bg-selected)" : "transparent",
                outline: isSelected ? "1px solid var(--t-border)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "var(--t-bg-hover)"
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = isSelected ? "var(--t-bg-selected)" : "transparent"
              }}
            >
              {/* Thumbnail */}
              <div
                className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border shadow-sm"
                style={{
                  backgroundColor: "var(--t-bg-elevated)",
                  borderColor: "var(--t-border)",
                }}
              >
                <img
                  src={project.thumbnailUrl}
                  alt={project.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm leading-snug line-clamp-1" style={{ color: "var(--t-text-1)" }}>
                  {project.title}
                </h4>
                <div className="flex items-center gap-3 text-xs mt-1" style={{ color: "var(--t-text-3)" }}>
                  <span className="flex items-center gap-1.5">
                    {project.deviceType === "desktop" ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    <span>{project.updatedAt}</span>
                  </span>

                  {project.genre && (
                    <span className="truncate" style={{ color: "var(--t-text-2)" }}>
                      {project.genre}
                    </span>
                  )}

                  {project.isShared && (
                    <span className="flex items-center gap-1" style={{ color: "var(--t-text-2)" }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Shared</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

ProjectGroupSection.displayName = "ProjectGroupSection"

export default ProjectsOverlay