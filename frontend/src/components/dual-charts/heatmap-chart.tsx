"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import FrameSlider from "../controls/frame-slider"
import DropdownGroup from "../controls/dropdown-group"
import ControlBar from "../controls/control-bar"
import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useDualInteractions } from "@/hooks/use-dual-interactions"
import { drawHeatmap } from "@/utils"
import type { ColorMap } from "@/types/visualization";
import * as d3 from "d3"


interface HeatmapVisualizationProps {
  data: [number[][], number[][]]
  numRows: number
  numCols: number
  mask: number[][]
  numFrames: number
  minValue: number
  maxValue: number
  onCellSelect: (cell: { frame: number, x: number, y: number, values: [number, number] } | null) => void
  onFrameChange?: (frame: number) => void
  selectedPoint: { frame: number, index: number, values: [number, number] } | null
}

export default function DualHeatmap({
  data,
  numRows,
  numCols,
  mask,
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
  const canvasRefs = useRef<[HTMLCanvasElement | null, HTMLCanvasElement | null]>([null, null])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number; values: [number, number] } | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; values: [number, number] } | null>(null)
  const interpolator = useRef<d3.ScaleSequential<string>>(d3.scaleSequential([minValue, maxValue], d3.interpolateViridis))


  const [showTooltips, setShowTooltips] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showControlBar, setShowControlBar] = useState(true)

  const prevFrameRef = useRef<number>(-1)
  const prevSelectedCellRef = useRef<{ x: number; y: number; values: [number, number] } | null>(null)
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
  } = useDualInteractions({
    externalCanvasRef: canvasRefs,

    draw: (canvasX, canvasY, offset, zoom) => {
      const frameDataX = data[0]
      const frameDataY = data[1]
      drawHeatmap(
        canvasX,
        offset,
        zoom,
        frameDataX,
        numRows,
        numCols,
        selectedCell,
        interpolator.current
      )
      drawHeatmap(
        canvasY,
        offset,
        zoom,
        frameDataY,
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
        const valueX = data[0][selectedCell.x]?.[selectedCell.y]
        const valueY = data[1][selectedCell.x]?.[selectedCell.y]
        if (valueX !== undefined && valueY !== undefined) {
          console.log("Updating selected cell values:", valueX, valueY)
          setSelectedCell({ x: selectedCell.x, y: selectedCell.y, values: [valueX, valueY] })
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
      let found = false
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          if (mask[c][r] === idx) {
            setSelectedCell({ x: c, y: r, values: selectedPoint.values })
            found = true
            break
          }
        }
        if (found) break
      }

      if (!found) {
        console.warn("Index not found in mask:", idx)
        setSelectedCell(null)
      }
      console.log("Setting selected cell from point:", selectedPoint)
    }
  }, [selectedPoint])

  // Notify parent of cell selection only when selection actually changes
  useEffect(() => {
    const cellChanged = selectedCell?.x !== prevSelectedCellRef.current?.x || selectedCell?.y !== prevSelectedCellRef.current?.y || selectedCell?.values !== prevSelectedCellRef.current?.values
    if (cellChanged) {
      prevSelectedCellRef.current = selectedCell
      if (selectedCell) {
        onCellSelect({ frame: currentFrame, x: selectedCell.x, y: selectedCell.y, values: selectedCell.values })
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
      return `${scale(value)} ${percentage}%` // bottom to top
    })
    return `linear-gradient(to top, ${colorStops.join(', ')})`
  }

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
        return { x: col, y: row }
      }
      return null
    },
    [numCols, numRows],
  )

  // If the clicked position changes, so does the selected cell
  useEffect(() => {
    if (clickPosition) {
      const cell = getCellFromCoordinates(clickPosition.x, clickPosition.y)
      if (cell) {
        const values: [number, number] = [
          data[0][cell.x]?.[cell.y],
          data[1][cell.x]?.[cell.y]
        ]
        if (values !== undefined && values[0] !== undefined && values[1] !== undefined && values[0] !== null && values[1] !== null) {
          console.log("Setting selected cell:", cell)
          setSelectedCell({ ...cell, values })
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
        const values: [number, number] = [
          data[0][cell.x]?.[cell.y],
          data[1][cell.x]?.[cell.y]
        ]
        if (values !== undefined && values[0] !== undefined && values[1] !== undefined && values[0] !== null && values[1] !== null) {

          setHoveredCell({ ...cell, values })
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
          <div className="flex flex-row h-full gap-2 border-2 border-gray-300 relative">
            {canvasRefs.current.map((_, idx) => (
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
                className={`flex-1 ${mode === "pan" ? "cursor-move" : "cursor-crosshair"}`}
              />
            ))}
          </div>
          {hoveredCell && showTooltips && (
            <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm pointer-events-none">
              Cell ({hoveredCell.x}, {hoveredCell.y}): Slope X: {hoveredCell.values[0].toFixed(2)}, Slope Y: {hoveredCell.values[1].toFixed(2)}
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
