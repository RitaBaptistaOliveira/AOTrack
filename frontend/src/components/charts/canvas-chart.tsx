"use client"

import type { useCanvasInteractions,  Point } from "@/hooks/use-canvas-interactions"
import { useEffect, useRef, useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useChartInteraction } from "@/contexts/chart-interactions-context"

type CanvasChartProps<TDrawArgs, TData> = {
  interaction: ReturnType<typeof useCanvasInteractions>
  // Function to draw on the canvas
  // It receives the canvas context and any additional arguments (scale, interval, colorMap, etc.)
  draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, drawArgs?: TDrawArgs) => void
  drawArgs?: TDrawArgs

  // Maps a canvas point to data. Needed for click interactions and hover tooltips.
  mapCanvasToData?: (pt: Point) => TData | null

  // Function to get the hovered data (might differ because of snapping, etc.)
  getHoveredDataAt?: (pt: Point) => TData | null

  // Functions to draw selected
  drawSelected?: (ctx: CanvasRenderingContext2D, data: TData) => void

  // Function to format the tooltip text
  formatTooltip?: (data: TData | null) => string
}

export default function CanvasChart<TDrawArgs, TData>({ interaction, draw, drawArgs, mapCanvasToData, getHoveredDataAt, drawSelected, formatTooltip }: CanvasChartProps<TDrawArgs, TData>) {
  console.log(interaction)
  
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

  } = interaction

  const { setSelectedPoint } = useChartInteraction()
  const [clickedData, setClickedData] = useState<TData | null>(null)
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Effect to handle click interactions
  // This effect runs whenever the click position changes, maps the click position to data, and sets the selected point
  useEffect(() => {
    console.log("Effect to handle click interactions")

    if (!clickPosition || !mapCanvasToData) return

    const pointTransformed = {
      x: (clickPosition.x - offset.x) / zoom,
      y: (clickPosition.y - offset.y) / zoom,
    }
    const data = mapCanvasToData(pointTransformed)
    setClickedData(data)
    if (data === null) {
      console.log("No data found at click position:", pointTransformed)
    } else setSelectedPoint(pointTransformed)
  }, [clickPosition, mapCanvasToData, offset, zoom])

  // Effect to render chart
  // This effect runs whenever the canvas size, zoom, offset, or draw arguments change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!bufferCanvasRef.current) {
      bufferCanvasRef.current = document.createElement("canvas");
    }
    const bufferCanvas = bufferCanvasRef.current;
    bufferCanvas.width = canvas.width;
    bufferCanvas.height = canvas.height;

    const ctx = canvas.getContext("2d")
    const bufferCtx = bufferCanvas.getContext("2d");
    if (!ctx || !bufferCtx) return

    console.log("Effect to render background chart")

    const render = async () => {
      bufferCtx.clearRect(0, 0, canvas.width, canvas.height)
      bufferCtx.save()
      bufferCtx.translate(offset.x, offset.y)
      bufferCtx.scale(zoom, zoom)

      await draw(bufferCtx, bufferCanvas, drawArgs)
      if (clickedData && drawSelected) {
        drawSelected(bufferCtx, clickedData)
      }

      bufferCtx.restore()

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bufferCanvas, 0, 0);
    }

    render()
  }, [zoom, offset, canvasSize, draw, drawArgs, clickedData])

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
                className="absolute"
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