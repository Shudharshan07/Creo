import React, { useState, useCallback } from "react"
import { ZoomIn, ZoomOut, Maximize2, Home } from "lucide-react"

interface BottomBarProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onFullscreen?: () => void
  onHome: () => void
}

const panelStyle: React.CSSProperties = {
  backgroundColor: "var(--t-bg-surface)",
  border: "1px solid var(--t-border)",
}


export const BottomBar: React.FC<BottomBarProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFullscreen,
  onHome,
}) => {
  const [prompt, setPrompt] = useState("")

  const handleSend = useCallback(() => {
    if (!prompt.trim()) return
    console.log("Prompt:", prompt)
    setPrompt("")
  }, [prompt])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )


  return (
    <div
      className="absolute bottom-6 left-6 right-6 z-30 grid items-center pointer-events-none"
      style={{ gridTemplateColumns: "1fr auto 1fr" }}
    >
      {/* Left spacer */}
      <div />

      {/* Center: Prompt Input */}
      <div
        className="pointer-events-auto flex items-center gap-3 rounded-2xl shadow-2xl px-3 py-2.5 w-[520px] max-w-[60vw] theme-transition"
        style={panelStyle}
      >
        {/* Spark badge */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
          style={{ backgroundColor: "var(--t-accent)" }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--t-accent-fg)" }}>
            <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
          </svg>
        </div>

        {/* Input */}
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell the crew what to build next..."
          className="flex-1 bg-transparent text-sm outline-none min-w-0 theme-transition"
          style={{
            color: "var(--t-text-1)",
          }}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!prompt.trim()}
          className="flex-shrink-0 text-sm font-medium transition-colors cursor-pointer px-1 theme-transition"
          style={{
            color: prompt.trim() ? "var(--t-text-2)" : "var(--t-text-4)",
          }}
        >
          Send
        </button>
      </div>

      {/* Right: Zoom Controls */}
      <div className="flex justify-end">
        <div
          className="pointer-events-auto flex items-center gap-1 rounded-2xl shadow-2xl px-3 py-2.5 theme-transition"
          style={panelStyle}
        >
          <HoverButton onClick={onZoomOut} title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </HoverButton>

          <button
            onClick={onZoomReset}
            title="Reset zoom"
            className="min-w-[46px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer theme-transition"
            style={{ color: "var(--t-text-2)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--t-bg-hover)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
          >
            {Math.round(zoom * 100)}%
          </button>

          <HoverButton onClick={onZoomIn} title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </HoverButton>

          <div className="w-px h-5 mx-0.5" style={{ backgroundColor: "var(--t-border)" }} />

          <HoverButton onClick={onFullscreen} title="Fullscreen">
            <Maximize2 className="w-4 h-4" />
          </HoverButton>

          <div className="w-px h-5 mx-0.5" style={{ backgroundColor: "var(--t-border)" }} />

          <HoverButton onClick={onHome} title="Reset view">
            <Home className="w-4 h-4" />
          </HoverButton>
        </div>
      </div>
    </div>
  )
}

const HoverButton: React.FC<{
  onClick?: () => void
  title?: string
  children: React.ReactNode
}> = ({ onClick, title, children }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer theme-transition"
      style={{
        color: hovered ? "var(--t-text-1)" : "var(--t-text-3)",
        backgroundColor: hovered ? "var(--t-bg-hover)" : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  )
}

export default BottomBar
