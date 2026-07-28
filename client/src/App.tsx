import React, { useState, useRef, useCallback } from "react"
import InfiniteDotCanvas, { type InfiniteDotCanvasHandle } from "./components/InfiniteDotCanvas"
import ProjectsOverlay from "./components/ProjectsOverlay"
import ProfileButton from "./components/ProfileButton"
import BottomBar from "./components/BottomBar"
import AccountSettingsModal from "./components/AccountSettingsModal"
import { LandingPage } from "./components/LandingPage"
import { LayoutGrid } from "lucide-react"

const ZOOM_STEP = 0.15
const MIN_ZOOM = 0.1
const MAX_ZOOM = 4

function App() {
  const [viewMode, setViewMode] = useState<"studio" | "landing">("studio")
  const [zoom, setZoom] = useState(1)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const canvasRef = useRef<InfiniteDotCanvasHandle>(null)

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

  if (viewMode === "landing") {
    return <LandingPage onEnterStudio={() => setViewMode("studio")} />
  }

  return (
    <main
      className="relative w-screen h-screen m-0 p-0 overflow-hidden select-none theme-transition"
      style={{ backgroundColor: "var(--t-bg-page)" }}
    >
      {/* Top Header Bar */}
      <div className="absolute top-6 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          <ProjectsOverlay />
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
          <ProfileButton onOpenSettings={() => setSettingsOpen(true)} />
        </div>
      </div>

      {/* Infinite Canvas */}
      <InfiniteDotCanvas
        ref={canvasRef}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      {/* Bottom Bar */}
      <BottomBar
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onFullscreen={handleFullscreen}
        onHome={handleZoomReset}
      />

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  )
}

export default App
