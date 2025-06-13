"use client"

import type React from "react"
import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import FrameSlider from "../controls/frame-slider"
import DropdownGroup from "../controls/dropdown-group"
import ControlBar from "../controls/control-bar"
import { useChartInteraction } from "@/contexts/chart-interactions-context"

type InteractionMode = "pan" | "select"

interface HeatmapVisualizationProps {
  data: number[][][]
  numRows: number
  numCols: number
  numFrames: number
  onCellSelect?: (cell: { x: number; y: number; value: number; frame: number } | null) => void
  onFrameChange?: (frame: number) => void
}

export default function HeatmapVisualization({
  data,
  numRows,
  numCols,
  numFrames,
  onCellSelect,
  onFrameChange,
}: HeatmapVisualizationProps) {
  const { interpolator } = useChartInteraction()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; value: number } | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const [interactionMode, setInteractionMode] = useState<InteractionMode>("select")
  const [showGrid, setShowGrid] = useState(true)
  const [showTooltips, setShowTooltips] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showControlBar, setShowControlBar] = useState(true)

  const prevFrameRef = useRef<number>(-1)
  const prevSelectedCellRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (currentFrame !== prevFrameRef.current) {
      prevFrameRef.current = currentFrame
      onFrameChange?.(currentFrame)
    }
  }, [currentFrame]) // Removed onFrameChange from dependencies

  // Notify parent of cell selection only when selection actually changes
  useEffect(() => {
    const cellChanged =
      selectedCell?.x !== prevSelectedCellRef.current?.x || selectedCell?.y !== prevSelectedCellRef.current?.y

    if (cellChanged) {
      prevSelectedCellRef.current = selectedCell

      if (selectedCell) {
        const value = data[currentFrame]?.[selectedCell.x]?.[selectedCell.y]
        if (value !== undefined) {
          onCellSelect?.({ ...selectedCell, value, frame: currentFrame })
        }
      } else {
        onCellSelect?.(null)
      }
    }
  }, [selectedCell, currentFrame, data]) // Removed onCellSelect from dependencies

  // Resize canvas to fit container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    setCanvasSize({ width: rect.width, height: rect.height })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })

    resizeObserver.observe(container)
    resizeCanvas()

    return () => {
      resizeObserver.disconnect()
    }
  }, [resizeCanvas])

  function generateColorGradient(min = 0, max = 1, steps = 20) {
    const colorStops = Array.from({ length: steps }, (_, i) => {
      const value = min + ((max - min) * i) / (steps - 1)
      const t = (value - min) / (max - min) // normalize to [0, 1]
      return `${interpolator(t)} ${t * 100}%` // bottom to top
    })
    return `linear-gradient(to top, ${colorStops.join(', ')})`
  }

  const getCanvasCoordinates = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const getCellFromCoordinates = useCallback(
    (canvasX: number, canvasY: number) => {
      if (canvasSize.width === 0 || canvasSize.height === 0) return null

      const squareSize = Math.min(canvasSize.width, canvasSize.height)
      const offsetX = (canvasSize.width - squareSize) / 2
      const offsetY = (canvasSize.height - squareSize) / 2

      const adjustedX = canvasX - offsetX
      const adjustedY = canvasY - offsetY

      if (adjustedX < 0 || adjustedX > squareSize || adjustedY < 0 || adjustedY > squareSize) {
        return null
      }

      const dataX = (adjustedX - offset.x) / zoom
      const dataY = (adjustedY - offset.y) / zoom

      const col = Math.floor(dataX / (squareSize / numCols))
      const row = Math.floor(dataY / (squareSize / numRows))

      if (col >= 0 && col < numCols && row >= 0 && row < numRows) {
        return { x: col, y: row }
      }
      return null
    },
    [zoom, offset, numCols, numRows, canvasSize],
  )

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    setDragStart(coords)
    setIsDragging(true)

    if (interactionMode === "select") {
      const cell = getCellFromCoordinates(coords.x, coords.y)
      setSelectedCell(cell)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    if (showTooltips) {
      const cell = getCellFromCoordinates(coords.x, coords.y)
      if (cell) {
        const value = data[currentFrame]?.[cell.x]?.[cell.y]
        if (value !== undefined) {
          setHoveredCell({ ...cell, value })
        }
      } else {
        setHoveredCell(null)
      }
    }

    if (isDragging && dragStart && interactionMode === "pan") {
      const dx = coords.x - dragStart.x
      const dy = coords.y - dragStart.y
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      setDragStart(coords)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    setDragStart(null)
    setHoveredCell(null)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomFactor = 1.1
    const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor
    setZoom(Math.min(Math.max(newZoom, 0.5), 5))
  }

  const zoomIn = () => setZoom((prev) => Math.min(prev * 1.2, 5))
  const zoomOut = () => setZoom((prev) => Math.max(prev / 1.2, 0.5))
  const resetZoom = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const downloadPNG = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = "heatmap.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const goToFrame = (frame: number) => {
    const frameNum = Math.max(0, Math.min(frame, numFrames - 1))
    setCurrentFrame(frameNum)
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const frameData = data[currentFrame]
    if (!frameData) return

    const squareSize = Math.min(canvasSize.width, canvasSize.height)
    const offsetX = (canvasSize.width - squareSize) / 2
    const offsetY = (canvasSize.height - squareSize) / 2

    const cellWidth = squareSize / numCols
    const cellHeight = squareSize / numRows

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    ctx.save()
    ctx.translate(offsetX + offset.x, offsetY + offset.y)
    ctx.scale(zoom, zoom)

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const value = frameData[row]?.[col]
        if (value !== undefined) {
          ctx.fillStyle = interpolator(value)
          ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight)

          if (showGrid) {
            ctx.strokeStyle = "#333"
            ctx.lineWidth = 1
            ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight)
          }
        }
      }
    }

    if (selectedCell) {
      ctx.strokeStyle = "#FF1493"
      ctx.lineWidth = 1
      ctx.strokeRect(selectedCell.x * cellWidth, selectedCell.y * cellHeight, cellWidth, cellHeight)
    }

    ctx.restore()
  }, [currentFrame, zoom, offset, selectedCell, showGrid, canvasSize, data, numCols, numRows])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-semibold">Heatmap</h2>
        <div className="flex gap-2">
          <DropdownGroup/>
          <Button variant="ghost" size="icon" onClick={() => setShowControlBar(!showControlBar)}>
            {showControlBar ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {showControlBar &&
        <ControlBar
          mode={interactionMode}
          onModeChange={setInteractionMode}
          showGrid={showGrid}
          showTooltips={showTooltips}
          showLegend={showLegend}
          onToggleGrid={() => setShowGrid((prev) => !prev)}
          onToggleTooltips={() => setShowTooltips((prev) => !prev)}
          onToggleLegend={() => setShowLegend((prev) => !prev)}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onDownloadPNG={downloadPNG}
          onReset={resetZoom}
        />
      }

      {/* Canvas Container */}
      <div className="flex-1 relative min-h-0">
        <div ref={containerRef} className="w-full h-full border-2 border-gray-300 relative">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
            className={`w-full h-full ${interactionMode === "pan" ? "cursor-move" : "cursor-crosshair"}`}
          />
          {hoveredCell && showTooltips && (
            <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm pointer-events-none">
              Cell ({hoveredCell.x}, {hoveredCell.y}): {hoveredCell.value}
            </div>
          )}

          {showLegend && (
            <div className="absolute top-0 right-0 bg-white border rounded p-2 gap-2 shadow h-full flex flex-col items-center text-xs justify-between">
              <div>{Math.max(...data[currentFrame].flat().flat())}</div>
              <div
                className="w-4 h-full rounded"
                style={{
                  background: generateColorGradient(
                    Math.min(...data[currentFrame].flat().flat()),
                    Math.max(...data[currentFrame].flat().flat()),
                    20
                  ),
                }}></div>
                <div>{Math.min(...data[currentFrame].flat().flat())}</div>
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
