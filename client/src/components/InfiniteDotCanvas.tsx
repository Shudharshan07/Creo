import React, { forwardRef, useImperativeHandle, useRef } from "react"
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch"
import AgentNodesOverlay from "./AgentNodesOverlay"
import { type AgentNode } from "../types/agent"
import { useTheme } from "../context/theme"

interface InfiniteDotCanvasProps {
  zoom: number
  onZoomChange: (zoom: number) => void
  agentNodes?: AgentNode[]
  onStopAgent?: (id: string) => void
  onMoveNode?: (id: string, x: number, y: number) => void
}

export interface InfiniteDotCanvasHandle {
  resetView: () => void
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4

const DotGrid: React.FC = () => {
  const { resolvedTheme } = useTheme()
  const dotColor = resolvedTheme === "dark" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)"
  const dotSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='10' cy='10' r='0.9' fill='${dotColor}'/></svg>`
  const bg = `url("data:image/svg+xml,${encodeURIComponent(dotSvg)}")`

  return (
    <div
      style={{
        position: "absolute",
        inset: "-9999px",
        backgroundImage: bg,
        backgroundRepeat: "repeat",
        backgroundSize: "20px 20px",
      }}
    />
  )
}

export const InfiniteDotCanvas = forwardRef<InfiniteDotCanvasHandle, InfiniteDotCanvasProps>(
  ({ zoom, onZoomChange, agentNodes = [], onStopAgent, onMoveNode }, ref) => {
    const transformRef = useRef<ReactZoomPanPinchRef>(null)

    useImperativeHandle(ref, () => ({
      resetView() {
        transformRef.current?.resetTransform()
        onZoomChange(1)
      },
    }))

    return (
      <TransformWrapper
        ref={transformRef}
        initialScale={zoom}
        minScale={MIN_ZOOM}
        maxScale={MAX_ZOOM}
        limitToBounds={false}
        centerOnInit={false}
        wheel={{ step: 0.08 }}
        panning={{ velocityDisabled: false }}
        doubleClick={{ disabled: true }}
        onTransform={(_ref, state) => onZoomChange(state.scale)}
      >
        <TransformComponent
          wrapperStyle={{ width: "100vw", height: "100vh", overflow: "hidden" }}
          contentStyle={{ width: "100vw", height: "100vh", position: "relative" }}
        >
          <DotGrid />
          <AgentNodesOverlay
            nodes={agentNodes}
            onStopAgent={onStopAgent ?? (() => {})}
            onMoveNode={onMoveNode ?? (() => {})}
            zoom={zoom}
          />
        </TransformComponent>
      </TransformWrapper>
    )
  }
)

InfiniteDotCanvas.displayName = "InfiniteDotCanvas"

export default InfiniteDotCanvas
