"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import FrameSlider from "../controls/frame-slider"
import DropdownGroup from "../controls/dropdown-group"
import ControlBar from "../controls/control-bar"
import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useInteractions } from "@/hooks/use-interactions"
import { drawHeatmap } from "@/utils"
import type { ColorMap } from "@/types/visualization";
import * as d3 from "d3"


interface HeatmapVisualizationProps {
  data: number[][]
  numRows: number
  numCols: number
  numFrames: number
  minValue: number
  maxValue: number
  onCellSelect: (cell: { frame: number, x: number, y: number, value: number } | null) => void
  onFrameChange?: (frame: number) => void
  selectedPoint: { frame: number, index: number, value: number } | null
}

export default function Visualization({
  data,
  numRows,
  numCols,
  numFrames,
  minValue,
  maxValue,
  onCellSelect,
  onFrameChange,
  selectedPoint
}: HeatmapVisualizationProps) {
  
  const getInterpolator = (colorMap: ColorMap) => {
    switch (colorMap) {
      case "inferno": return d3.scaleSequential([minValue, maxValue], d3.interpolateInferno)
      case "greys": return d3.scaleSequential([minValue, maxValue], d3.interpolateGreys)
      case "blues": return d3.scaleSequential([minValue, maxValue], d3.interpolateBlues)
      case "reds": return d3.scaleSequential([minValue, maxValue], d3.interpolateReds)
      case "greens": return d3.scaleSequential([minValue, maxValue], d3.interpolateGreens)
      case "rainbow": return d3.scaleSequential([minValue, maxValue], d3.interpolateRainbow)
      case "viridis":
      default: return d3.scaleSequential([minValue, maxValue], d3.interpolateViridis)
    }
  };
  const { colorMap } = useChartInteraction()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number; value: number } | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; value: number } | null>(null)
  const interpolator = useRef<d3.ScaleSequential<string>>(d3.scaleSequential([minValue, maxValue], d3.interpolateViridis))

  const [showTooltips, setShowTooltips] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showControlBar, setShowControlBar] = useState(true)

  const prevFrameRef = useRef<number>(-1)
  const prevSelectedCellRef = useRef<{ x: number; y: number; value: number } | null>(null)
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
    requestDraw,
    scheduleDraw
  } = useInteractions({
    externalCanvasRef: canvasRef,
    draw: (canvas, offset, zoom) => {
      drawHeatmap(
        canvas,
        offset,
        zoom,
        data,
        numRows,
        numCols,
        selectedCell,
        interpolator.current
      )
    }
  })

  useEffect(() => {
    interpolator.current = getInterpolator(colorMap)
    requestDraw()
  }, [colorMap])


  useEffect(() => {
    if (currentFrame !== prevFrameRef.current) {
      prevFrameRef.current = currentFrame
      onFrameChange?.(currentFrame)
      if (selectedCell) {
        const value = data[selectedCell.x]?.[selectedCell.y]
        if (value !== undefined) {
          setSelectedCell({ x: selectedCell.x, y: selectedCell.y, value: value })
        }
      }
      requestDraw()
    }
  }, [currentFrame])


  useEffect(() => {
    if (selectedPoint === null) {
      setSelectedCell(null)
    } else {
      const idx = selectedPoint.index
      setCurrentFrame(selectedPoint.frame)
      setSelectedCell({ x: Math.floor(idx / numRows), y: idx % numRows, value: selectedPoint.value })
    }

  }, [selectedPoint])

  // Notify parent of cell selection only when selection actually changes
  useEffect(() => {

    const cellChanged = selectedCell?.x !== prevSelectedCellRef.current?.x || selectedCell?.y !== prevSelectedCellRef.current?.y || selectedCell?.value !== prevSelectedCellRef.current?.value

    if (cellChanged) {
      prevSelectedCellRef.current = selectedCell
      if (selectedCell) {
        onCellSelect({ frame: currentFrame, x: selectedCell.x, y: selectedCell.y, value: selectedCell.value })
      } else {
        onCellSelect(null)
      }
      requestDraw()
    }
  }, [selectedCell])


  useEffect(() => {
    scheduleDraw()
  }, [data])


  function generateColorGradient(min = 0, max = 1, steps = 20) {
    const scale = getInterpolator(colorMap); 
    const colorStops = Array.from({ length: steps }, (_, i) => {
      const value = min + ((max - min) * i) / (steps - 1)
      const percentage = (i / (steps - 1)) * 100
      return `${scale(value)} ${percentage}%`
    })
    return `linear-gradient(to top, ${colorStops.join(', ')})`
  }

  const getCellFromCoordinates = useCallback(
    (canvasX: number, canvasY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      if (canvas.width === 0 || canvas.height === 0) return null

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
        return { x: col, y: row }
      }
      return null
    },
    [numCols, numRows],
  )

  // If the clicked position changes, so does the selected sell
  useEffect(() => {
    if (clickPosition) {
      const cell = getCellFromCoordinates(clickPosition.x, clickPosition.y)
      if (cell) {
        const value = data[cell.x]?.[cell.y]
        if (value !== undefined && value !== null) {
          setSelectedCell({ ...cell, value })
        }
      } else {
        setSelectedCell(null)
      }
    }
  }, [clickPosition])

  useEffect(() => {
    if (hoverPos && showTooltips) {
      const cell = getCellFromCoordinates(hoverPos.x, hoverPos.y)
      if (cell) {
        const value = data[cell.x]?.[cell.y]
        if (value !== undefined && value !== null) {
          setHoveredCell({ ...cell, value })
        }
      } else {
        setHoveredCell(null)
      }
    }
  }, [hoverPos])

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
          {hoveredCell && showTooltips && (
            <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm pointer-events-none">
              Cell ({hoveredCell.x}, {hoveredCell.y}): {hoveredCell.value.toFixed(2)}
            </div>
          )}

          {showLegend && (
            <div className="absolute top-0 right-0 bg-white border rounded p-2 gap-2 shadow h-full flex flex-col items-center text-xs justify-between">
              <div>{maxValue.toFixed(2)}</div>
              <div
                className="w-4 h-full rounded"
                style={{
                  background: generateColorGradient(
                    minValue,
                    maxValue,
                    100
                  ),
                }}></div>
              <div>{minValue.toFixed(2)}</div>
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
