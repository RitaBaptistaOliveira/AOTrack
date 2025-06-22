"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import ControlBar from "../controls/control-bar"
import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useInteractions } from "@/hooks/use-interactions"
import { drawFlatHeatmapFromBuffer, generateHeatmapBuffer } from "@/utils"
type FitMode = "squeeze" | "scroll";


interface FlatHeatmapProps {
  data: number[][]
  numIndexes: number
  numFrames: number
  onPointSelect?: (point: { frame: number; x: number; y: number | undefined; value: number; } | null) => void
}

export default function FlapHeatmap({
  data,
  numIndexes,
  numFrames,
  onPointSelect,
}: FlatHeatmapProps) {
  const { interpolator } = useChartInteraction()
  const heatmapBufferRef = useRef<HTMLCanvasElement | null>(null);
  const [fitMode, setFitMode] = useState<FitMode>("squeeze");
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedPoint, setSelectedPoint] = useState<{ index: number; frame: number; value: number } | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; frame: number; value: number } | null>(null)
  const [showTooltips, setShowTooltips] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showControlBar, setShowControlBar] = useState(true)
  const maxValue = data.reduce(
    (max, row) => Math.max(max, ...row),
    -Infinity
  );
  const minValue = data.reduce(
    (min, row) => Math.min(min, ...row),
    Infinity
  );

  const prevPointRef = useRef<{ index: number; frame: number; value: number } | null>(null)
  const {
    mode,
    canvasSize,
    setMode,
    clickPosition,
    hoverPos,
    offsetRef,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    handleMouseDown,
    handleMouseLeave,
    handleMouseMove,
    handleMouseUp,
    handleMouseWheel,
    downloadPNG
  } = useInteractions({
    externalCanvasRef: canvasRef,
    draw: (canvas, offset, zoom, drawArgs) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      console.log(heatmapBufferRef.current)
      console.log(canvasSize)
      console.log(!heatmapBufferRef.current && canvasSize.width && canvasSize.height)
      if (!heatmapBufferRef.current && canvasSize.width && canvasSize.height) {
        heatmapBufferRef.current = generateHeatmapBuffer(
          data,
          numFrames,
          numIndexes,
          interpolator,
          canvasSize
        );
      }

      const buffer = heatmapBufferRef.current;
      if (!buffer) return;

      drawFlatHeatmapFromBuffer(
        ctx,
        canvasSize,
        offset,
        zoom,
        buffer,
        drawArgs.selectedPoint
      )
    },
    drawArgs: {
      selectedPoint: selectedPoint ?? undefined
    }
  })

  function generateColorGradient(min = 0, max = 1, steps = 20) {
    const colorStops = Array.from({ length: steps }, (_, i) => {
      const value = min + ((max - min) * i) / (steps - 1)
      const t = (value - min) / (max - min)
      return `${interpolator(t)} ${t * 100}%`
    })
    return `linear-gradient(to top, ${colorStops.join(', ')})`
  }

  const getPointFromCoordinates = useCallback(
    (canvasX: number, canvasY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      if (canvas.width === 0 || canvas.height === 0) return null

      const squareSize = Math.min(canvas.width, canvas.height)
      // const offsetX = (canvas.width - squareSize) / 2
      // const offsetY = (canvas.height - squareSize) / 2

      // const adjustedX = canvasX - offsetX
      // const adjustedY = canvasY - offsetY

      const dataX = (canvasX - offsetRef.current.x) / zoom
      const dataY = (canvasY - offsetRef.current.y) / zoom

      const frame = Math.floor(dataX / (squareSize / numFrames))
      const index = Math.floor(dataY / (squareSize / numIndexes))

      if (frame >= 0 && frame < numFrames && index >= 0 && index < numIndexes) {
        return { frame: frame, index: index }
      }
      return null
    },
    [zoom, numIndexes, numFrames],
  )

  // If the clicked position changes, so does the selected sell
  useEffect(() => {
    if (clickPosition) {
      const point = getPointFromCoordinates(clickPosition.x, clickPosition.y)
      if (point && point?.frame === prevPointRef.current?.frame && point?.index === prevPointRef.current?.index) {
        const value = data?.[point.frame]?.[point.index]
        if (value !== undefined && value !== prevPointRef.current?.value) {
          setSelectedPoint({ ...point, value })
          onPointSelect?.({ frame: point.frame, x: point.index, y: undefined, value: value })
        }
      } else {
        setSelectedPoint(null)
      }
    }
  }, [clickPosition])

  useEffect(() => {
    console.log("ENTER")
    if (hoverPos && showTooltips) {
      const point = getPointFromCoordinates(hoverPos.x, hoverPos.y)
      if (point) {
        const value = data?.[point.frame]?.[point.index]
        if (value !== undefined) {
          setHoveredPoint({ ...point, value })
        }
      } else {
        setHoveredPoint(null)
      }
    }
  }, [hoverPos])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-semibold">Flat Heatmap</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setFitMode(f => f === "squeeze" ? "scroll" : "squeeze")}>
            {fitMode}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowControlBar(!showControlBar)}>
            {showControlBar ? <ChevronUp /> : <ChevronDown />}
          </Button>


        </div>
      </div>

      {showControlBar &&
        <ControlBar
          mode={mode}
          onModeChange={setMode}
          showTooltips={showTooltips}
          showLegend={showLegend}
          onToggleTooltips={() => setShowTooltips((prev) => !prev)}
          onToggleLegend={() => setShowLegend((prev) => !prev)}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onDownloadPNG={downloadPNG}
        />
      }

      {/* Canvas Container */}
      <div className="flex-1 relative min-h-0">
        <div className="w-full h-full border-2 border-gray-300 relative">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleMouseWheel}
            className={`w-full h-full ${mode === "pan" ? "cursor-move" : "cursor-crosshair"}`}
          />
          {hoveredPoint && showTooltips && (
            <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm pointer-events-none">
              Point ({hoveredPoint.frame}, {hoveredPoint.index}): {hoveredPoint.value}
            </div>
          )}

          {showLegend && (
            <div className="absolute top-0 right-0 bg-white border rounded p-2 gap-2 shadow h-full flex flex-col items-center text-xs justify-between">
              <div>{maxValue}</div>
              <div
                className="w-4 h-full rounded"
                style={{
                  background: generateColorGradient(
                    minValue,
                    maxValue,
                    20
                  ),
                }}></div>
              <div>{minValue}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
