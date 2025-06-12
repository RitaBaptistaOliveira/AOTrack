"use client"

import type React from "react"

import ControlBar from "../controls/control-bar"
import DropdownGroup from "../controls/dropdown-group"
import FrameSlider from "../controls/frame-slider"
import { useCallback, useRef, useState, useEffect, createContext, useContext } from "react"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "../ui/button"
import { useCanvasInteractions, type Point } from "@/hooks/use-canvas-interactions"
import * as d3 from "d3"

// Simple local context for chart interactions
const ChartContext = createContext<{
  currentFrame: number
  setCurrentFrame: (frame: number) => void
  interpolator: (t: number) => string
} | null>(null)

function ChartProvider({ children }: { children: React.ReactNode }) {
  const [currentFrame, setCurrentFrame] = useState(0)
  const interpolator = d3.interpolateViridis

  return (
    <ChartContext.Provider value={{ currentFrame, setCurrentFrame, interpolator }}>{children}</ChartContext.Provider>
  )
}

function useChartInteraction() {
  const context = useContext(ChartContext)
  if (!context) throw new Error("useChartInteraction must be used within ChartProvider")
  return context
}

interface HeatmapChartProps {
  frames: number[][][]
  numRows: number
  numCols: number
  numFrames: number
}

function HeatmapChartInner({ frames, numRows, numCols, numFrames }: HeatmapChartProps) {
  const {
    canvasRef,
    mode,
    zoom,
    offset,
    canvasSize,
    clickPosition,
    hoverPos,

    setMode,
    zoomIn,
    zoomOut,
    resetZoom,
    downloadPNG,

    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleMouseWheel,
  } = useCanvasInteractions()

  const { currentFrame, interpolator, setCurrentFrame } = useChartInteraction()

  const [showControlBar, setShowControlBar] = useState<boolean>(true)
  const [selectedCell, setSelectedCell] = useState<Point | null>(null)
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Map canvas coordinates to grid cell
  const mapCanvasToCell = useCallback(
    (canvasPoint: Point): Point | null => {
      const canvas = canvasRef.current
      if (!canvas) return null

      // Calculate cell size based on current canvas dimensions
      const cellWidth = canvas.width / (window.devicePixelRatio || 1) / numCols
      const cellHeight = canvas.height / (window.devicePixelRatio || 1) / numRows

      // Transform canvas point to data space
      const dataX = (canvasPoint.x - offset.x) / zoom
      const dataY = (canvasPoint.y - offset.y) / zoom

      const col = Math.floor(dataX / cellWidth)
      const row = Math.floor(dataY / cellHeight)

      if (col >= 0 && col < numCols && row >= 0 && row < numRows) {
        return { x: col, y: row }
      }
      return null
    },
    [numCols, numRows, offset, zoom],
  )

  // Handle click to select cell
  useEffect(() => {
    if (!clickPosition) return
    const cell = mapCanvasToCell(clickPosition)
    setSelectedCell(cell)
  }, [clickPosition, mapCanvasToCell])

  // Handle hover for tooltip
  useEffect(() => {
    if (!hoverPos) {
      setHoveredTooltip(null)
      return
    }

    const cell = mapCanvasToCell(hoverPos)
    if (cell && frames[currentFrame]) {
      const value = frames[currentFrame][cell.x]?.[cell.y]
      if (value !== undefined) {
        setHoveredTooltip(`Cell (${cell.x}, ${cell.y}): ${value.toFixed(3)}`)
      } else {
        setHoveredTooltip(null)
      }
    } else {
      setHoveredTooltip(null)
    }
  }, [hoverPos, mapCanvasToCell, frames, currentFrame])

  // Main drawing function
  const drawHeatmap = useCallback(
    async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      const frameData = frames[currentFrame]
      if (!frameData) {
        console.error("No data for current frame:", currentFrame)
        return
      }

      // Calculate cell dimensions
      const canvasWidth = canvas.width / (window.devicePixelRatio || 1)
      const canvasHeight = canvas.height / (window.devicePixelRatio || 1)
      const cellWidth = canvasWidth / numCols
      const cellHeight = canvasHeight / numRows

      try {
        // Simple normalization of data for visualization
        const flatValues = frameData.flat().flat()
        const minVal = Math.min(...flatValues)
        const maxVal = Math.max(...flatValues)
        const range = maxVal - minVal || 1

        // Draw cells
        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const value = frameData[col]?.[row]
            if (value !== undefined) {
              // Normalize value for display
              const normalizedValue = (value - minVal) / range
              ctx.fillStyle = interpolator(normalizedValue)
              ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight)
            }
          }
        }

        // Draw selected cell highlight
        if (selectedCell) {
          ctx.strokeStyle = "#FF69B4"
          ctx.lineWidth = 2
          ctx.strokeRect(selectedCell.x * cellWidth, selectedCell.y * cellHeight, cellWidth, cellHeight)
        }
      } catch (error) {
        console.error("Error processing frame data:", error)
      }
    },
    [frames, currentFrame, numRows, numCols, selectedCell, interpolator],
  )

  // Render effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Setup buffer canvas
    if (!bufferCanvasRef.current) {
      bufferCanvasRef.current = document.createElement("canvas")
    }
    const bufferCanvas = bufferCanvasRef.current
    bufferCanvas.width = canvas.width
    bufferCanvas.height = canvas.height

    const ctx = canvas.getContext("2d")
    const bufferCtx = bufferCanvas.getContext("2d")
    if (!ctx || !bufferCtx) return

    const render = async () => {
      // Clear buffer
      bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height)

      // Apply transformations
      bufferCtx.save()
      bufferCtx.translate(offset.x, offset.y)
      bufferCtx.scale(zoom, zoom)

      // Draw heatmap
      await drawHeatmap(bufferCtx, bufferCanvas)

      bufferCtx.restore()

      // Copy buffer to main canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bufferCanvas, 0, 0)
    }

    render()
  }, [zoom, offset, canvasSize, drawHeatmap])

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-row justify-between">
        <h2 className="text-sm sm:text-base md:text-lg font-semibold">Heatmap Visualization</h2>
        <div className="flex items-center justify-between gap-2">
          <DropdownGroup />
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowControlBar((prev) => !prev)}>
                    {showControlBar ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle control bar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {showControlBar && (
        <div className="py-2">
          <ControlBar
            interaction={{
              mode: mode,
              onModeChange: setMode,
            }}
            display={{
              showGrid: false,
              showTooltips: false,
              showLegend: false,
              onToggleGrid: () => {},
              onToggleTooltips: () => {},
              onToggleLegend: () => {},
            }}
            zoom={{
              onZoomIn: zoomIn,
              onZoomOut: zoomOut,
              onResetZoom: resetZoom,
            }}
            utility={{
              onDownloadPNG: downloadPNG,
              onReset: resetZoom,
            }}
          />
        </div>
      )}

      <div className="flex-1 p-0 flex flex-col">
        <div className="flex-1 relative w-full h-full">
          <div className="absolute inset-0">
            <TooltipProvider>
              <Tooltip open={!!hoveredTooltip}>
                <TooltipTrigger asChild>
                  <canvas
                    ref={canvasRef}
                    className="absolute w-full h-full"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onWheel={handleMouseWheel}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {hoveredTooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="pt-2">
          <FrameSlider totalFrames={numFrames} currentFrame={currentFrame} setCurrentFrame={setCurrentFrame} />
        </div>
      </div>
    </div>
  )
}

export default function HeatmapChart(props: HeatmapChartProps) {
  return (
    <ChartProvider>
      <HeatmapChartInner {...props} />
    </ChartProvider>
  )
}
