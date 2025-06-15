"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import ControlBar from "../controls/control-bar"
import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useInteractions } from "@/hooks/use-interactions"
import { drawFlatHeatmap } from "@/utils"
import * as d3 from "d3";
import { Application, Graphics, Color } from "pixi.js";
interface FlatHeatmapProps {
  data: number[][]
  numIndexes: number
  numFrames: number
  onPointSelect?: (point: { index: number; value: number; frame: number } | null) => void
}

export default function FlapHeatmap({
  data,
  numIndexes,
  numFrames,
  onPointSelect,
}: FlatHeatmapProps) {

  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const { interpolator } = useChartInteraction()
  
  useEffect(() => {
  let cancelled = false;

  async function setup() {
    console.log("[PixiHeatmap] useEffect triggered");

    if (!data.length || !data[0].length) {
      console.warn("[PixiHeatmap] Invalid data format", data);
      return;
    }

    const container = containerRef.current;
    if (!container) {
      console.warn("[PixiHeatmap] No container element found");
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    console.log(`[PixiHeatmap] Container size: width=${width}, height=${height}`);

    if (appRef.current) {
      appRef.current.destroy(true, { children: true });
      appRef.current = null;
    }

    const app = new Application();

    await app.init({
      width,
      height,
      backgroundAlpha: 0,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (cancelled) return;

    container.appendChild(app.canvas);
    appRef.current = app;

    const flatValues = data.flat();
    const min = d3.min(flatValues)!;
    const max = d3.max(flatValues)!;
    console.log(`[PixiHeatmap] Data range: min=${min}, max=${max}`);

    const colorScale = d3.scaleSequential(interpolator).domain([min, max]);

    const cellWidth = width / data.length;
    const cellHeight = height / data[0].length;
    console.log(`[PixiHeatmap] Cell size: ${cellWidth}x${cellHeight}`);

    const graphics = new Graphics();

    for (let frame = 0; frame < data.length; frame++) {
      for (let index = 0; index < data[frame].length; index++) {
        const value = data[frame][index];
        const color = d3.color(colorScale(value));
        if (!color) continue;
        const hex = new Color(color.formatHex()).toNumber();
        graphics.fill(hex);
        graphics.rect(frame * cellWidth, index * cellHeight, cellWidth, cellHeight);
      }
    }

    app.stage.addChild(graphics);

    console.log("[PixiHeatmap] Rendering complete");
  }

  setup();

  return () => {
    cancelled = true;
    if (appRef.current) {
      appRef.current.destroy(true, { children: true });
      appRef.current = null;
    }
  };
}, [data, interpolator]);
  // const canvasRef = useRef<HTMLCanvasElement>(null)
  // const [selectedPoint, setSelectedPoint] = useState<{ index: number; frame: number; value: number } | null>(null)
  // const [hoveredPoint, setHoveredPoint] = useState<{ index: number; frame: number; value: number } | null>(null)
  // const [showTooltips, setShowTooltips] = useState(true)
  // const [showLegend, setShowLegend] = useState(true)
  // const [showControlBar, setShowControlBar] = useState(true)
  // const maxValue = data.reduce(
  //   (max, row) => Math.max(max, ...row),
  //   -Infinity
  // );
  // const minValue = data.reduce(
  //   (min, row) => Math.min(min, ...row),
  //   Infinity
  // );

  // const prevPointRef = useRef<{ index: number; frame: number; value: number } | null>(null)
  // const {
  //   mode,
  //   setMode,
  //   clickPosition,
  //   hoverPos,
  //   offsetRef,
  //   zoom,
  //   zoomIn,
  //   zoomOut,
  //   resetZoom,
  //   handleMouseDown,
  //   handleMouseLeave,
  //   handleMouseMove,
  //   handleMouseUp,
  //   handleMouseWheel,
  //   downloadPNG,
  //   scheduleDraw
  // } = useInteractions({
  //   externalCanvasRef: canvasRef,
  //   draw: (canvas, offset, zoom, drawArgs) => {
  //     drawFlatHeatmap(
  //       canvas,
  //       offset,
  //       zoom,
  //       drawArgs.data,
  //       drawArgs.numIndexes,
  //       drawArgs.numFrames,
  //       drawArgs.selectedPoint,
  //       drawArgs.interpolator
  //     )
  //   },
  //   drawArgs: {
  //     data: data,
  //     numIndexes: numIndexes,
  //     numFrames: numFrames,
  //     selectedPoint: selectedPoint,
  //     interpolator: interpolator
  //   }

  // })



  // useEffect(() => {
  //   scheduleDraw()
  // }, [data])


  // function generateColorGradient(min = 0, max = 1, steps = 20) {
  //   const colorStops = Array.from({ length: steps }, (_, i) => {
  //     const value = min + ((max - min) * i) / (steps - 1)
  //     const t = (value - min) / (max - min) // normalize to [0, 1]
  //     return `${interpolator(t)} ${t * 100}%` // bottom to top
  //   })
  //   return `linear-gradient(to top, ${colorStops.join(', ')})`
  // }

  // const getPointFromCoordinates = useCallback(
  //   (canvasX: number, canvasY: number) => {
  //     const canvas = canvasRef.current
  //     if (!canvas) return
  //     if (canvas.width === 0 || canvas.height === 0) return null

  //     const squareSize = Math.min(canvas.width, canvas.height)
  //     const offsetX = (canvas.width - squareSize) / 2
  //     const offsetY = (canvas.height - squareSize) / 2

  //     const adjustedX = canvasX - offsetX
  //     const adjustedY = canvasY - offsetY

  //     if (adjustedX < 0 || adjustedX > squareSize || adjustedY < 0 || adjustedY > squareSize) {
  //       return null
  //     }

  //     const dataX = (adjustedX - offsetRef.current.x) / zoom
  //     const dataY = (adjustedY - offsetRef.current.y) / zoom

  //     const frame = Math.floor(dataX / (squareSize / numFrames))
  //     const index = Math.floor(dataY / (squareSize / numIndexes))

  //     if (frame >= 0 && frame < numFrames && index >= 0 && index < numIndexes) {
  //       return { frame: frame, index: index }
  //     }
  //     return null
  //   },
  //   [zoom, numIndexes, numFrames],
  // )

  // // If the clicked position changes, so does the selected sell
  // useEffect(() => {
  //   if (clickPosition) {
  //     const point = getPointFromCoordinates(clickPosition.x, clickPosition.y)
  //     if (point && point?.frame === prevPointRef.current?.frame && point?.index === prevPointRef.current?.index) {
  //       const value = data?.[point.frame]?.[point.index]
  //       if (value !== undefined && value !== prevPointRef.current?.value) {
  //         setSelectedPoint({ ...point, value })
  //         onPointSelect?.({ ...point, value })
  //       }
  //     } else {
  //       setSelectedPoint(null)
  //     }
  //   }
  // }, [clickPosition])

  // useEffect(() => {
  //   if (hoverPos && showTooltips) {
  //     const point = getPointFromCoordinates(hoverPos.x, hoverPos.y)
  //     if (point) {
  //       const value = data[point.frame]?.[point.index]
  //       if (value !== undefined) {
  //         setHoveredPoint({ ...point, value })
  //       }
  //     } else {
  //       setHoveredPoint(null)
  //     }
  //   }
  // }, [hoverPos])

  return (
    <div className="h-full flex flex-col">
      {/* Header
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-semibold">Flat Heatmap</h2>
        <div className="flex gap-1">
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
      } */}

      {/* Canvas Container */}
      <div className="flex-1 relative min-h-0">
        {/* <div className="w-full h-full border-2 border-gray-300 relative">
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
        </div> */}
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  )
}
