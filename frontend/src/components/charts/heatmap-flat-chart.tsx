"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import ControlBar from "../controls/control-bar"
import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useInteractions } from "@/hooks/use-interactions"
import { drawFlatHeatmapFromBuffer, generateHeatmapBuffer } from "@/utils"
type FitMode = "squeeze" | "scroll";


interface FlatHeatmapProps {
  data: number[][]
  numRows: number
  numIndexes: number
  numFrames: number
  onPointSelect?: (point: { frame: number; x: number; y: number | undefined; value: number; } | null) => void
  selectedCell: { frame: number, x: number, y: number, value: number } | null
}

export default function FlapHeatmap({
  data,
  numRows,
  numIndexes,
  numFrames,
  onPointSelect,
  selectedCell
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
    zoomRef,
    zoomIn,
    zoomOut,
    resetZoom,
    handleMouseDown,
    handleMouseLeave,
    handleMouseMove,
    handleMouseUp,
    handleMouseWheel,
    handleKeyDown,
    downloadPNG,
    scheduleDraw
  } = useInteractions({
    externalCanvasRef: canvasRef,
    draw: (canvas, offset, zoom, drawArgs) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return

      drawFlatHeatmapFromBuffer(
        ctx,
        offset,
        zoom,
        heatmapBufferRef.current,
        drawArgs.selectedPoint
      )
    },
    drawArgs: {
      selectedPoint: selectedPoint ?? undefined
    }
  })

  useEffect(() => {
    if (selectedCell === null) return
    console.log("CELL-FLAT: ", selectedCell)
    setSelectedPoint({index: selectedCell.x * numRows + selectedCell.y, frame: selectedCell.frame, value: selectedCell.value})
    console.log("POINT-FLAT: ", {index: selectedCell.x * numRows + selectedCell.y, frame: selectedCell.frame, value: selectedCell.value})
  }, [selectedCell])

  useEffect(() => {
    if (canvasSize.width && canvasSize.height) {
      heatmapBufferRef.current = generateHeatmapBuffer(
        data,
        numFrames,
        numIndexes,
        interpolator,
        canvasSize
      );
    }
    scheduleDraw()
  }, [data, numFrames, numIndexes, interpolator, canvasSize])

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

      const zoomLevel = zoomRef.current
      const offset = offsetRef.current

      const cellSize = Math.floor(canvas.width / numFrames)
      const offsetX = (canvas.width - (heatmapBufferRef.current?.width ?? 0)) / 2
      const x = (canvasX - offset.x - offsetX) / zoomLevel
      const y = (canvasY - offset.y) / zoomLevel


      const frame = Math.floor(x / cellSize)
      const index = Math.floor(y / cellSize)

      if (frame >= 0 && frame < numFrames && index >= 0 && index < numIndexes) {
        return { frame: frame, index: index }
      }
      return null
    },
    [numIndexes, numFrames],
  )

  useEffect(() => {
    const pointChanged =
      selectedPoint?.frame !== prevPointRef.current?.frame || selectedPoint?.index !== prevPointRef.current?.index || selectedPoint?.value !== prevPointRef.current?.value

    if (pointChanged) {
      prevPointRef.current = selectedPoint
      if (selectedPoint) {
        onPointSelect?.({ frame: selectedPoint.frame, x: selectedPoint.index, y: undefined, value: selectedPoint.value })
      } else {
        onPointSelect?.(null)
      }
      scheduleDraw()
    }
  }, [selectedPoint])

  // If the clicked position changes, so does the selected sell
  useEffect(() => {
    if (clickPosition) {
      const point = getPointFromCoordinates(clickPosition.x, clickPosition.y)
      if (point) {
        const value = data?.[point.frame]?.[point.index]
        if (value !== undefined && value !== prevPointRef.current?.value) {
          setSelectedPoint({ ...point, value })
        }
      } else {
        setSelectedPoint(null)
      }
    }
  }, [clickPosition])

  useEffect(() => {
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
            tabIndex={0}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleMouseWheel}
            onKeyDown={handleKeyDown}
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
