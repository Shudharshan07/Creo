import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react"

interface InfiniteDotCanvasProps {
  dotSpacing?: number
  baseRadius?: number
  zoom: number
  onZoomChange: (zoom: number) => void
}

export interface InfiniteDotCanvasHandle {
  resetView: () => void
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.15

export const InfiniteDotCanvas = forwardRef<InfiniteDotCanvasHandle, InfiniteDotCanvasProps>(
  ({ dotSpacing = 10, baseRadius = 0.2, zoom, onZoomChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    const offsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
    const isDraggingRef = useRef<boolean>(false)
    const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
    const dirtyRef = useRef<boolean>(true)
    const zoomRef = useRef<number>(zoom)

    // Keep zoomRef in sync with prop without restarting the render loop
    useEffect(() => {
      zoomRef.current = zoom
      dirtyRef.current = true
    }, [zoom])

    // Expose resetView to parent
    useImperativeHandle(ref, () => ({
      resetView() {
        offsetRef.current = { x: 0, y: 0 }
        onZoomChange(1)
        dirtyRef.current = true
      },
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d", { alpha: false })
      if (!ctx) return

      let animationFrameId: number
      let width = 0
      let height = 0
      let dpr = 1

      const handleResize = () => {
        dpr = window.devicePixelRatio || 1
        width = window.innerWidth
        height = window.innerHeight
        canvas.width = width * dpr
        canvas.height = height * dpr
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        ctx.scale(dpr, dpr)
        dirtyRef.current = true
      }

      handleResize()
      window.addEventListener("resize", handleResize)

      // Re-draw when theme class changes on <html>
      const themeObserver = new MutationObserver(() => { dirtyRef.current = true })
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

      // Intercept wheel events to prevent browser zoom, do canvas zoom instead
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current + delta))

        // Zoom toward the cursor position
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top

        // Adjust offset so the point under cursor stays fixed
        const scale = next / zoomRef.current
        offsetRef.current = {
          x: mx - scale * (mx - offsetRef.current.x),
          y: my - scale * (my - offsetRef.current.y),
        }

        zoomRef.current = next
        onZoomChange(next)
        dirtyRef.current = true
      }

      // passive:false required to call preventDefault inside wheel handler
      canvas.addEventListener("wheel", handleWheel, { passive: false })

      const dotSize = baseRadius * 2

      const render = () => {
        animationFrameId = requestAnimationFrame(render)
        if (!dirtyRef.current) return
        dirtyRef.current = false

        const offset = offsetRef.current
        const z = zoomRef.current

        // Read theme colors fresh each frame from CSS variables
        const style = getComputedStyle(document.documentElement)
        const bgColor = style.getPropertyValue("--t-bg-page").trim() || "#0B0C10"
        const dotA = style.getPropertyValue("--t-canvas-dot-a").trim() || "rgba(255,255,255,0.45)"
        const dotB = style.getPropertyValue("--t-canvas-dot-b").trim() || "rgba(140,145,155,0.25)"

        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, width, height)

        const effectiveSpacing = dotSpacing * z
        const effectiveRadius = baseRadius * z
        const effectiveDotSize = dotSize * z

        const startGx = Math.floor(-offset.x / effectiveSpacing)
        const endGx = Math.ceil((width - offset.x) / effectiveSpacing)
        const startGy = Math.floor(-offset.y / effectiveSpacing)
        const endGy = Math.ceil((height - offset.y) / effectiveSpacing)

        ctx.fillStyle = dotA
        for (let gx = startGx; gx <= endGx; gx++) {
          for (let gy = startGy; gy <= endGy; gy++) {
            if ((Math.abs(gx) + Math.abs(gy)) % 2 === 0) {
              const sx = gx * effectiveSpacing + offset.x
              const sy = gy * effectiveSpacing + offset.y
              ctx.fillRect(sx - effectiveRadius, sy - effectiveRadius, effectiveDotSize, effectiveDotSize)
            }
          }
        }

        ctx.fillStyle = dotB
        for (let gx = startGx; gx <= endGx; gx++) {
          for (let gy = startGy; gy <= endGy; gy++) {
            if ((Math.abs(gx) + Math.abs(gy)) % 2 !== 0) {
              const sx = gx * effectiveSpacing + offset.x
              const sy = gy * effectiveSpacing + offset.y
              ctx.fillRect(sx - effectiveRadius, sy - effectiveRadius, effectiveDotSize, effectiveDotSize)
            }
          }
        }
      }

      render()

      return () => {
        window.removeEventListener("resize", handleResize)
        canvas.removeEventListener("wheel", handleWheel)
        cancelAnimationFrame(animationFrameId)
        themeObserver.disconnect()
      }
    }, [dotSpacing, baseRadius, onZoomChange])

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      offsetRef.current = {
        x: offsetRef.current.x + dx,
        y: offsetRef.current.y + dy,
      }
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      dirtyRef.current = true
    }, [])

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      isDraggingRef.current = true
      dragStartRef.current = { x: e.clientX, y: e.clientY }
    }, [])

    const handleMouseUp = useCallback(() => { isDraggingRef.current = false }, [])
    const handleMouseLeave = useCallback(() => { isDraggingRef.current = false }, [])

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 0 || !isDraggingRef.current) return
      const touch = e.touches[0]
      const dx = touch.clientX - dragStartRef.current.x
      const dy = touch.clientY - dragStartRef.current.y
      offsetRef.current = {
        x: offsetRef.current.x + dx,
        y: offsetRef.current.y + dy,
      }
      dragStartRef.current = { x: touch.clientX, y: touch.clientY }
      dirtyRef.current = true
    }, [])

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 0) return
      isDraggingRef.current = true
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }, [])

    const handleTouchEnd = useCallback(() => { isDraggingRef.current = false }, [])

    const handleReset = useCallback(() => {
      offsetRef.current = { x: 0, y: 0 }
      onZoomChange(1)
      dirtyRef.current = true
    }, [onZoomChange])

    return (
      <div className="relative w-screen h-screen overflow-hidden bg-[#0B0C10] select-none">
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-grab active:cursor-grabbing touch-none"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

      </div>
    )
  }
)

InfiniteDotCanvas.displayName = "InfiniteDotCanvas"

export default InfiniteDotCanvas
