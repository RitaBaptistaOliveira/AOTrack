"use client"

import type React from "react"
import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ZoomIn, ZoomOut, RotateCcw, Camera, Move, MousePointer, Grid3X3, Info, Palette, FileText } from "lucide-react"
import FrameSlider from "../controls/frame-slider"

type InteractionMode = "pan" | "select"
type ColorMap = "viridis" | "inferno" | "plasma" | "greys" | "blues" | "reds" | "greens"
type ScaleType = "linear" | "log" | "sqrt" | "pow"

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
  const [colorMap, setColorMap] = useState<ColorMap>("viridis")
  const [scaleType, setScaleType] = useState<ScaleType>("linear")
  const [showGrid, setShowGrid] = useState(true)
  const [showTooltips, setShowTooltips] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showControlBar, setShowControlBar] = useState(true)

  // Use refs to track previous values to prevent unnecessary calls
  const prevFrameRef = useRef<number>(-1)
  const prevSelectedCellRef = useRef<{ x: number; y: number } | null>(null)

  // Notify parent of frame changes only when frame actually changes
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

  const getColorInterpolator = (colormap: ColorMap) => {
    const colormaps = {
      viridis: [
        [68, 1, 84],
        [59, 82, 139],
        [33, 145, 140],
        [94, 201, 98],
        [253, 231, 37],
      ],
      inferno: [
        [0, 0, 4],
        [40, 11, 84],
        [101, 21, 110],
        [159, 42, 99],
        [212, 72, 66],
        [245, 125, 21],
        [252, 194, 0],
      ],
      plasma: [
        [13, 8, 135],
        [75, 3, 161],
        [125, 3, 168],
        [168, 34, 150],
        [203, 70, 121],
        [229, 107, 93],
        [248, 148, 65],
        [253, 195, 40],
      ],
      greys: [
        [0, 0, 0],
        [64, 64, 64],
        [128, 128, 128],
        [192, 192, 192],
        [255, 255, 255],
      ],
      blues: [
        [8, 48, 107],
        [8, 81, 156],
        [33, 113, 181],
        [66, 146, 198],
        [107, 174, 214],
        [158, 202, 225],
        [198, 219, 239],
        [247, 251, 255],
      ],
      reds: [
        [103, 0, 13],
        [165, 15, 21],
        [203, 24, 29],
        [239, 59, 44],
        [251, 106, 74],
        [252, 146, 114],
        [252, 187, 161],
        [254, 229, 217],
      ],
      greens: [
        [0, 68, 27],
        [0, 109, 44],
        [35, 139, 69],
        [65, 171, 93],
        [116, 196, 118],
        [161, 217, 155],
        [199, 233, 192],
        [247, 252, 245],
      ],
    }

    return (t: number) => {
      const colors = colormaps[colormap]
      const scaledT = t * (colors.length - 1)
      const i = Math.floor(scaledT)
      const f = scaledT - i

      if (i >= colors.length - 1) return `rgb(${colors[colors.length - 1].join(",")})`
      if (i < 0) return `rgb(${colors[0].join(",")})`

      const c1 = colors[i]
      const c2 = colors[i + 1]
      const r = Math.round(c1[0] + f * (c2[0] - c1[0]))
      const g = Math.round(c1[1] + f * (c2[1] - c1[1]))
      const b = Math.round(c1[2] + f * (c2[2] - c1[2]))

      return `rgb(${r}, ${g}, ${b})`
    }
  }

  const applyScale = (value: number, min: number, max: number, scaleType: ScaleType) => {
    const normalized = (value - min) / (max - min)
    switch (scaleType) {
      case "log":
        return Math.log(normalized + 1) / Math.log(2)
      case "sqrt":
        return Math.sqrt(normalized)
      case "pow":
        return Math.pow(normalized, 2)
      default:
        return normalized
    }
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

    const flatValues = frameData.flat().flat()
    const minVal = Math.min(...flatValues)
    const maxVal = Math.max(...flatValues)
    const range = maxVal - minVal || 1

    const colorInterpolator = getColorInterpolator(colorMap)

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    ctx.save()
    ctx.translate(offsetX + offset.x, offsetY + offset.y)
    ctx.scale(zoom, zoom)

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const value = frameData[col]?.[row]
        if (value !== undefined) {
          const scaledValue = applyScale(value, minVal, maxVal, scaleType)
          ctx.fillStyle = colorInterpolator(scaledValue)
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
      ctx.lineWidth = 3
      ctx.strokeRect(selectedCell.x * cellWidth, selectedCell.y * cellHeight, cellWidth, cellHeight)
    }

    ctx.restore()
  }, [currentFrame, zoom, offset, selectedCell, colorMap, scaleType, showGrid, canvasSize, data, numCols, numRows])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold">Heatmap</h2>
        <div className="flex gap-2">
          <Select value={scaleType} onValueChange={(value: ScaleType) => setScaleType(value)}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="log">Log</SelectItem>
              <SelectItem value="sqrt">Sqrt</SelectItem>
              <SelectItem value="pow">Power</SelectItem>
            </SelectContent>
          </Select>

          <Select value="minmax">
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue placeholder="MinMax" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minmax">MinMax</SelectItem>
              <SelectItem value="zscale">Z-Scale</SelectItem>
              <SelectItem value="percentile">Percentile</SelectItem>
            </SelectContent>
          </Select>

          <Select value={colorMap} onValueChange={(value: ColorMap) => setColorMap(value)}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viridis">Viridis</SelectItem>
              <SelectItem value="inferno">Inferno</SelectItem>
              <SelectItem value="plasma">Plasma</SelectItem>
              <SelectItem value="greys">Greys</SelectItem>
              <SelectItem value="blues">Blues</SelectItem>
              <SelectItem value="reds">Reds</SelectItem>
              <SelectItem value="greens">Greens</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" onClick={() => setShowControlBar(!showControlBar)}>
            {showControlBar ? "▲" : "▼"}
          </Button>
        </div>
      </div>

      {/* Control Bar */}
      {showControlBar && (
        <div className="flex items-center gap-1 mb-4 p-2 bg-gray-50 rounded flex-shrink-0">
          <Button variant="outline" size="icon" onClick={downloadPNG}>
            <Camera className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300" />
          <Button variant="outline" size="icon" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={resetZoom}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300" />
          <Button
            variant={interactionMode === "pan" ? "default" : "outline"}
            size="icon"
            onClick={() => setInteractionMode("pan")}
          >
            <Move className="h-4 w-4" />
          </Button>
          <Button
            variant={interactionMode === "select" ? "default" : "outline"}
            size="icon"
            onClick={() => setInteractionMode("select")}
          >
            <MousePointer className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300" />
          <Button variant={showGrid ? "default" : "outline"} size="icon" onClick={() => setShowGrid(!showGrid)}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={showTooltips ? "default" : "outline"}
            size="icon"
            onClick={() => setShowTooltips(!showTooltips)}
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button variant={showLegend ? "default" : "outline"} size="icon" onClick={() => setShowLegend(!showLegend)}>
            <Palette className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300" />
          <Button variant="outline" size="icon" onClick={resetZoom}>
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      )}

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
            <div className="absolute top-0 right-4 bg-white border rounded p-2 shadow">
              <div className="text-xs font-medium mb-2">Color Scale</div>
              <div className="w-4 h-32 bg-gradient-to-t from-purple-900 via-blue-500 via-green-400 to-yellow-300 rounded"></div>
              <div className="text-xs mt-1">
                <div>Max: {Math.max(...data[currentFrame].flat().flat())}</div>
                <div>Min: {Math.min(...data[currentFrame].flat().flat())}</div>
              </div>
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
