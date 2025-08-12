"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import FrameSlider from "../controls/frame-slider"
import DropdownGroup from "../controls/dropdown-group"
import ControlBar from "../controls/control-bar"
import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useCanvasInteractions } from "@/hooks/use-canvas-interactions"
import { drawHeatmap } from "@/utils"
import { createColorScale } from "@/utils/color-scales"

interface HeatmapVisualizationProps {
  data: number[][][]
  numRows: number
  numCols: number
  numFrames: number
  minValue: number
  maxValue: number
  onCellSelect: (cell: { frame: number, col: number, row: number } | null) => void
  onFrameChange: (frame: number) => void
  selectedCell: { frame: number, col: number, row: number } | null
}

export default function Heatmap({
  data,
  numRows,
  numCols,
  numFrames,
  minValue,
  maxValue,
  onCellSelect,
  onFrameChange,
  selectedCell
}: HeatmapVisualizationProps) {

  const { colorMap, scaleType, intervalType } = useChartInteraction()
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number; values: number[] } | null>(null)

  const [showTooltips, setShowTooltips] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showControlBar, setShowControlBar] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)
  const [gradientStops, setGradientStops] = useState<{ offset: string; color: string; }[]>([])


  const colorScale = useMemo(() => {
    const { gradientStops, colorScale } = createColorScale(data.flat(), colorMap, scaleType, intervalType, minValue, maxValue)
    setGradientStops(gradientStops)
    return colorScale
  }, [data, colorMap, scaleType, intervalType, minValue, maxValue, svgRef])

  const prevFrameRef = useRef<number>(-1)
  const prevSelectedCellRef = useRef<{ frame: number, col: number; row: number } | null>(null)
  const {
    mode,
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
    requestDraw
  } = useCanvasInteractions({
    externalCanvasRefs: canvasRefs,
    draw: (canvases, offset, zoom) => {
      canvases.forEach((canvas, i) => {
        drawHeatmap(
          canvas,
          offset,
          zoom,
          data[i],
          numRows,
          numCols,
          selectedCell,
          colorScale,
          colorMap
        )
      })
    }
  })

  useEffect(() => {
    if (currentFrame !== prevFrameRef.current) {
      prevFrameRef.current = currentFrame
      onFrameChange(currentFrame)
      requestDraw()
    }
  }, [currentFrame])

  useEffect(() => {
    if (selectedCell && selectedCell.frame !== currentFrame) {
      setCurrentFrame(selectedCell.frame)
    }
    requestDraw()
  }, [selectedCell, data])

  useEffect(() => {
    if (clickPosition) {
      const cell = getCellFromCoordinates(clickPosition.x, clickPosition.y)
      const prevCell = prevSelectedCellRef.current

      const cellChanged = cell?.col !== prevCell?.col || cell?.row !== prevCell?.row

      if (cellChanged) {
        if (cell) {
          const values = data.map(frame => frame[cell.col][cell.row])
          if (values.every(v => v !== null)) {
            onCellSelect({
              frame: currentFrame,
              col: cell.col,
              row: cell.row
            })
            prevSelectedCellRef.current = { frame: currentFrame, ...cell }
          }
        } else {
          onCellSelect(null)
          prevSelectedCellRef.current = null
        }
      }
    }
  }, [clickPosition])

  useEffect(() => {
    if (hoverPos && showTooltips) {
      const cell = getCellFromCoordinates(hoverPos.x, hoverPos.y)
      if (cell) {
        const values = data.map(frame => frame[cell.col][cell.row])
        if (values.every(v => v !== null)) {
          setHoveredCell({ ...cell, values })
        } else {
          setHoveredCell(null)
        }
      } else {
        setHoveredCell(null)
      }
    }
  }, [hoverPos])

  const getCellFromCoordinates = useCallback(
    (canvasX: number, canvasY: number) => {
      const canvas = canvasRefs.current[0]
      if (!canvas) return

      const squareSize = Math.min(canvas.width, canvas.height)
      const offsetX = (canvas.width - squareSize) / 2
      const offsetY = (canvas.height - squareSize) / 2

      const adjustedX = canvasX - offsetX
      const adjustedY = canvasY - offsetY

      const dataX = (adjustedX - offsetRef.current.x) / zoomRef.current
      const dataY = (adjustedY - offsetRef.current.y) / zoomRef.current

      const col = Math.floor(dataX / (squareSize / numCols))
      const row = Math.floor(dataY / (squareSize / numRows))

      if (col >= 0 && col < numCols && row >= 0 && row < numRows) {
        return { col: col, row: row }
      }
      return null
    }, [numCols, numRows])

  const goToFrame = (frame: number) => {
    setCurrentFrame(Math.max(0, Math.min(frame, numFrames - 1)))
  }

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = prev + 1
        if (next >= numFrames) {
          setIsPlaying(false)
          return prev
        }
        return next
      })
    }, 500)
    return () => clearInterval(interval)
  }, [isPlaying, numFrames])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-semibold">Heatmap</h2>
        <div className="flex gap-1">
          <DropdownGroup />
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
          <div className="flex flex-row h-full gap-2 border-2 border-gray-300 relative">
            {data.map((_, idx) => (
              <canvas
                key={idx}
                ref={(el) => { canvasRefs.current[idx] = el }}
                tabIndex={0}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onWheel={handleMouseWheel}
                onKeyDown={handleKeyDown}
                className={`${mode === "pan" ? "cursor-move" : "cursor-crosshair"}`}
              />
            ))}
          </div>
          {hoveredCell && showTooltips && (
            <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm pointer-events-none">
              Cell ({hoveredCell.col}, {hoveredCell.row}): Intensity: {hoveredCell.values[0]?.toFixed(2)}
              {/* , Slope Y: {hoveredCell.values[1]?.toFixed(2)} */}
            </div>
          )}

          {showLegend && (
            <div className="absolute top-0 right-0 bg-white border rounded p-2 gap-2 shadow h-full flex flex-col items-center text-xs justify-between">
              <div>{maxValue.toPrecision(3)}</div>
              <svg className="w-4 h-full">
                <defs>
                  <linearGradient id="legend-gradient" x1="0" y1="1" x2="0" y2="0">
                    {gradientStops.map((stop, i) => (
                      <stop key={i} offset={stop.offset} stopColor={stop.color} />
                    ))}
                  </linearGradient>
                </defs>
                <rect
                  fill="url(#legend-gradient)"
                  rx="5"
                  className="w-full h-full"
                />
              </svg>
              <div>{minValue.toPrecision(3)}</div>

            </div>
          )}
        </div>
      </div>

      {/* Frame Controls */}
      <div className="mt-4 flex-shrink-0">
        <FrameSlider
          totalFrames={numFrames}
          currentFrame={currentFrame}
          setCurrentFrame={goToFrame}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
        />
      </div>
    </div>
  )
}
