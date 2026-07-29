import React, { useState, useMemo, memo, useCallback, useEffect } from "react"
import { type Project } from "../types/project"
import { createProject, deleteProject, listProjects, updateProject } from "../lib/api"
import { Ellipsis, FolderKanban, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"

interface ProjectsOverlayProps {
  token: string
  selectedProjectId?: string | null
  onSelectProject?: (project: Project | null) => void
}

export const ProjectsOverlay: React.FC<ProjectsOverlayProps> = ({ token, selectedProjectId: activeProjectId, onSelectProject }) => {
  const [isOpen, setIsOpen] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [projectsList, setProjectsList] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null)
  const [isMutatingProject, setIsMutatingProject] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newGenre, setNewGenre] = useState("")

  useEffect(() => {
    let isActive = true

    listProjects(token)
      .then((projects) => {
        if (!isActive) return
        setProjectsList(projects)
        setSelectedProjectId((current) => {
          const nextId = current || activeProjectId || projects[0]?.id || ""
          const nextProject = projects.find((project) => project.id === nextId) ?? projects[0]
          if (nextProject) onSelectProject?.(nextProject)
          return nextProject?.id ?? ""
        })
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
  }, [activeProjectId, onSelectProject, token])

  useEffect(() => {
    if (!activeProjectId) return
    setSelectedProjectId(activeProjectId)
  }, [activeProjectId])

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

  const [renamingProject, setRenamingProject] = useState<Project | null>(null)
  const [renameTitleInput, setRenameTitleInput] = useState("")
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

  const handleOpenRename = useCallback((project: Project) => {
    setRenamingProject(project)
    setRenameTitleInput(project.title)
    setMenuProjectId(null)
  }, [])

  const handleOpenDelete = useCallback((project: Project) => {
    setDeletingProject(project)
    setMenuProjectId(null)
  }, [])

  const submitRenameProject = useCallback(async () => {
    if (!renamingProject) return
    const nextTitle = renameTitleInput.trim()
    if (!nextTitle || nextTitle === renamingProject.title) {
      setRenamingProject(null)
      return
    }

    setIsMutatingProject(true)
    setError(null)
    try {
      const updatedProject = await updateProject(token, renamingProject.id, { title: nextTitle })
      setProjectsList((projects) => projects.map((item) => item.id === renamingProject.id ? updatedProject : item))
      if (selectedProjectId === renamingProject.id) {
        onSelectProject?.(updatedProject)
      }
      setRenamingProject(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to rename project")
    } finally {
      setIsMutatingProject(false)
    }
  }, [onSelectProject, renameTitleInput, renamingProject, selectedProjectId, token])

  const confirmDeleteProject = useCallback(async () => {
    if (!deletingProject) return

    setIsMutatingProject(true)
    setError(null)
    try {
      await deleteProject(token, deletingProject.id)
      const remainingProjects = projectsList.filter((item) => item.id !== deletingProject.id)
      setProjectsList(remainingProjects)

      if (selectedProjectId === deletingProject.id) {
        const nextProject = remainingProjects[0] ?? null
        setSelectedProjectId(nextProject?.id ?? "")
        onSelectProject?.(nextProject)
      }
      setDeletingProject(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete project")
    } finally {
      setIsMutatingProject(false)
    }
  }, [deletingProject, onSelectProject, projectsList, selectedProjectId, token])

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
            {isMutatingProject && !isLoading && (
              <div className="pb-2 flex items-center gap-2 text-xs" style={{ color: "var(--t-text-3)" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Updating project
              </div>
            )}
            {recentProjects.length > 0 && (
              <ProjectGroupSection
                title="Recent"
                projects={recentProjects}
                selectedProjectId={selectedProjectId}
                onSelect={handleSelect}
                menuProjectId={menuProjectId}
                onToggleMenu={setMenuProjectId}
                onRename={handleOpenRename}
                onDelete={handleOpenDelete}
              />
            )}
            {thisYearProjects.length > 0 && (
              <ProjectGroupSection
                title="This Year"
                projects={thisYearProjects}
                selectedProjectId={selectedProjectId}
                onSelect={handleSelect}
                menuProjectId={menuProjectId}
                onToggleMenu={setMenuProjectId}
                onRename={handleOpenRename}
                onDelete={handleOpenDelete}
              />
            )}
            {examplesProjects.length > 0 && (
              <ProjectGroupSection
                title="Examples"
                projects={examplesProjects}
                selectedProjectId={selectedProjectId}
                onSelect={handleSelect}
                menuProjectId={menuProjectId}
                onToggleMenu={setMenuProjectId}
                onRename={handleOpenRename}
                onDelete={handleOpenDelete}
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

      {/* Custom Rename Project Modal */}
      {renamingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-3xl border shadow-2xl p-6 theme-transition"
            style={{ backgroundColor: "var(--t-bg-panel)", borderColor: "var(--t-border)", color: "var(--t-text-1)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Pencil className="w-4 h-4" style={{ color: "var(--t-accent)" }} />
                <span>Rename Project</span>
              </h3>
              <button
                onClick={() => setRenamingProject(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ color: "var(--t-text-3)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--t-text-3)" }}>
              Enter a new title for <strong style={{ color: "var(--t-text-1)" }}>"{renamingProject.title}"</strong>
            </p>
            <form onSubmit={(e) => { e.preventDefault(); submitRenameProject(); }}>
              <input
                type="text"
                value={renameTitleInput}
                onChange={(e) => setRenameTitleInput(e.target.value)}
                placeholder="Project title"
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none mb-6 border theme-transition"
                style={{ backgroundColor: "var(--t-bg-input)", borderColor: "var(--t-border)", color: "var(--t-text-1)" }}
                autoFocus
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRenamingProject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  style={{ color: "var(--t-text-2)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameTitleInput.trim() || isMutatingProject}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  style={{ backgroundColor: "var(--t-accent)", color: "var(--t-accent-fg)" }}
                >
                  {isMutatingProject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Title</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Project Confirmation Modal */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-3xl border shadow-2xl p-6 theme-transition"
            style={{ backgroundColor: "var(--t-bg-panel)", borderColor: "var(--t-border)", color: "var(--t-text-1)" }}
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(248,113,113,0.15)", color: "var(--t-danger)" }}>
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold mb-2">Delete Project</h3>
            <p className="text-xs mb-6 leading-relaxed" style={{ color: "var(--t-text-3)" }}>
              Are you sure you want to delete <strong style={{ color: "var(--t-text-1)" }}>"{deletingProject.title}"</strong>? This will permanently remove all associated scene breakdowns and agent outputs.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{ color: "var(--t-text-2)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProject}
                disabled={isMutatingProject}
                className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
                style={{ backgroundColor: "var(--t-danger)", color: "#ffffff" }}
              >
                {isMutatingProject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Project</span>
              </button>
            </div>
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
  menuProjectId: string | null
  onToggleMenu: (projectId: string | null) => void
  onRename: (project: Project) => void
  onDelete: (project: Project) => void
}

const ProjectGroupSection: React.FC<ProjectGroupSectionProps> = memo(({
  title,
  projects,
  selectedProjectId,
  onSelect,
  menuProjectId,
  onToggleMenu,
  onRename,
  onDelete,
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

              <div className="relative flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleMenu(menuProjectId === project.id ? null : project.id)
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors theme-transition"
                  style={{ color: "var(--t-text-3)" }}
                  title="Project options"
                >
                  <Ellipsis className="w-4 h-4" />
                </button>

                {menuProjectId === project.id && (
                  <div
                    className="absolute right-0 top-9 z-20 w-40 rounded-2xl shadow-2xl py-1.5"
                    style={{
                      backgroundColor: "var(--t-bg-elevated)",
                      border: "1px solid var(--t-border)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ProjectMenuItem
                      label="Rename"
                      icon={<Pencil className="w-4 h-4" />}
                      onClick={() => onRename(project)}
                    />
                    <ProjectMenuItem
                      label="Delete"
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={() => onDelete(project)}
                      danger
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

ProjectGroupSection.displayName = "ProjectGroupSection"

const ProjectMenuItem: React.FC<{
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
}> = ({ label, icon, onClick, danger = false }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-3 py-2 flex items-center gap-2 text-xs transition-colors"
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

export default ProjectsOverlay
