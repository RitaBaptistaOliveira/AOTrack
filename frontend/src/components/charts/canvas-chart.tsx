import { useCanvasInteractions, type Point } from "@/hooks/use-canvas-interactions"
import { useEffect, useMemo, useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useChartInteraction } from "@/contexts/chart-interactions-context"

type CanvasChartProps<TDrawArgs, TData> = {
  // Function to draw on the canvas
  // It receives the canvas context and any additional arguments (scale, interval, colorMap, etc.)
  draw: (ctx: CanvasRenderingContext2D, drawArgs: TDrawArgs) => void
  drawArgs: TDrawArgs

  // Maps a canvas point to data. Needed for click interactions and hover tooltips.
  mapCanvasToData?: (pt: Point) => TData | null

  // Function to get the hovered data (might differ because of snapping, etc.)
  getHoveredDataAt?: (pt: Point) => TData | null,

  // Functions to draw selected
  drawSelected?: (ctx: CanvasRenderingContext2D, data: TData) => void

  // Function to format the tooltip text
  formatTooltip?: (data: TData | null) => string
}

export default function CanvasChart<TDrawArgs, TData>({ draw, drawArgs, mapCanvasToData, getHoveredDataAt, drawSelected, formatTooltip }: CanvasChartProps<TDrawArgs, TData>) {
  const {
    canvasRef,
    zoom,
    offset,
    canvasSize,
    clickPosition,
    hoverPos,

    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleMouseWheel
  } = useCanvasInteractions()

  const { setSelectedPoint } = useChartInteraction()
  const [clickedData, setClickedData] = useState<TData | null>(null)
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)

  useEffect(() => {
    if (!clickPosition || !mapCanvasToData) return

    const pointTransformed = {
      x: (clickPosition.x - offset.x) / zoom,
      y: (clickPosition.y - offset.y) / zoom,
    }
    setSelectedPoint(pointTransformed)

    setClickedData(mapCanvasToData(pointTransformed))
    if (clickedData === null) {
      console.log("No data found at click position:", pointTransformed)
    }
  }, [clickPosition, mapCanvasToData, offset, zoom])

  // Effect to render the canvas
  // This effect runs whenever the canvas size, zoom, offset, or draw arguments change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    console.log("CanvasChart render")

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(zoom, zoom)

    draw(ctx, drawArgs)
    if (clickedData && drawSelected) {
      drawSelected(ctx, clickedData)
    }

    ctx.restore()
  }, [canvasRef, zoom, offset, canvasSize, draw, drawArgs])

  // Effect to handle clicked data
  // Only redraws clickedData if it changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (clickedData && drawSelected) {
      drawSelected(ctx, clickedData)
    }

  }, [clickedData, drawSelected])

  // Effect to handle hovered data
  useEffect(() => {
    if (!hoverPos || !getHoveredDataAt) {
      setHoveredTooltip(null)
      return
    }

    const pointTransformed = {
      x: (hoverPos.x - offset.x) / zoom,
      y: (hoverPos.y - offset.y) / zoom,
    }
    setHoveredTooltip(formatTooltip ? formatTooltip(getHoveredDataAt(pointTransformed)) : null)
  }, [hoverPos, getHoveredDataAt, offset, zoom])

  return (
    <div className="flex-1 relative w-full h-full">
      <div className="absolute inset-0 ">
        <TooltipProvider>
          <Tooltip open={!!hoveredTooltip}>
            <TooltipTrigger asChild>
              <canvas
                ref={canvasRef}
                className="bg-white"
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
  )
}