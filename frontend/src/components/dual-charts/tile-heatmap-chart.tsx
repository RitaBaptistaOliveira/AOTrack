"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import ControlBar from "../controls/control-bar"
import { drawFlatHeatmapFromBuffer } from "@/utils"
import { useCanvasInteractions } from "@/hooks/use-canvas-interactions"
import * as d3 from "d3"

const TILE_SIZE = 256
const CELL_SIZE = 6

interface TileHeatmapProps {
  numFrames: number
  numIndexes: number
  dim: number
  minValue: number
  maxValue: number
  onPointSelect: (point: { frame: number, index: number } | null) => void
  onFetchTile: (frameStart: number, frameEnd: number, indexStart: number, indexEnd: number) => Promise<number[][][]>
  selectedPoint: { frame: number, index: number } | null
}

export default function TileHeatmap({
  numFrames,
  numIndexes,
  dim,
  minValue,
  maxValue,
  onPointSelect,
  onFetchTile,
  selectedPoint
}: TileHeatmapProps) {
  const tileCache = useRef(new Map<string, { canvas: HTMLCanvasElement; frameStart: number; indexStart: number, tile: number[][] }>())
  const interpolator = d3.scaleSequential([minValue, maxValue], d3.interpolateViridis)
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const requestedTiles = useRef(new Set<string>())
  const [hoveredPoint, setHoveredPoint] = useState<{ frame: number, index: number, values: number[] } | null>(null)
  const [showTooltips, setShowTooltips] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showControlBar, setShowControlBar] = useState(true)
  const prevPointRef = useRef<{ frame: number, index: number } | null>(null)
  const lastVisibleKeys = useRef<Set<string>>(new Set())

  const pendingTiles = useRef<Set<string>>(new Set())

  const queueVisibleTileFetches = useCallback((tiles: ReturnType<typeof getVisibleTiles>) => {
    tiles.forEach((tile) => {

      for (let d = 0; d < dim; d++) {
        const key = tile.key
        const fullKey = `${key}:${d}`
        if (!tileCache.current.has(fullKey) && !requestedTiles.current.has(fullKey)) {
          pendingTiles.current.add(key)
        }
      }
    })
  }, [requestedTiles, tileCache, pendingTiles])

  useEffect(() => {
    const interval = setInterval(() => {
      const tilesToFetch = Array.from(pendingTiles.current)
      tilesToFetch.forEach((key) => {
        const [frameRange, indexRange] = key.split(":")
        const [frameStart, frameEnd] = frameRange.split("-").map(Number)
        const [indexStart, indexEnd] = indexRange.split("-").map(Number)

        fetchAndRenderTile(frameStart, frameEnd, indexStart, indexEnd)
      })

      pendingTiles.current.clear()
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const getVisibleTiles = (offset: { x: number; y: number }, zoom: number, width: number, height: number) => {
    const tilePixelSize = CELL_SIZE * zoom * TILE_SIZE
    const frameStart = Math.floor(-offset.x / tilePixelSize) * TILE_SIZE
    const indexStart = Math.floor(-offset.y / tilePixelSize) * TILE_SIZE

    const cols = Math.ceil(width / tilePixelSize) + 1
    const rows = Math.ceil(height / tilePixelSize) + 1

    const tiles = []
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const fStart = frameStart + i * TILE_SIZE
        const iStart = indexStart + j * TILE_SIZE
        if (fStart < 0 || iStart < 0 || fStart > numFrames || iStart > numIndexes) continue

        const key = `${fStart}-${fStart + TILE_SIZE}:${iStart}-${iStart + TILE_SIZE}`

        tiles.push({
          key,
          frameStart: fStart,
          frameEnd: fStart + TILE_SIZE,
          indexStart: iStart,
          indexEnd: iStart + TILE_SIZE
        })
      }
    }

    return tiles
  }

  const fetchAndRenderTile = async (frameStart: number, frameEnd: number, indexStart: number, indexEnd: number) => {
    const keys: string[] = []
    for (let d = 0; d < dim; d++) {
      const key = `${frameStart}-${frameEnd}:${indexStart}-${indexEnd}:${d}`
      if (tileCache.current.has(key)) continue
      keys.push(key)
      requestedTiles.current.add(key)
    }
    if (keys.length === 0) {
      return
    }

    try {
      const tiles = await onFetchTile(frameStart, frameEnd, indexStart, indexEnd)

      for (let d = 0; d < dim; d++) {
        const canvas = document.createElement("canvas")
        const tile = tiles[d]
        canvas.width = tile.length * CELL_SIZE
        canvas.height = tile[0].length * CELL_SIZE
        const ctx = canvas.getContext("2d")!

        for (let i = 0; i < tile.length; i++) {
          for (let j = 0; j < tile[i].length; j++) {
            ctx.fillStyle = interpolator(tile[i][j])
            ctx.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE)
          }
        }
        tileCache.current.set(keys[d], {
          canvas,
          frameStart,
          indexStart,
          tile
        })
      }


      scheduleDraw()
    }
    finally {
      for (const key of keys) {
        requestedTiles.current.delete(key)
      }
    }
  }

  const draw = useCallback((canvases: HTMLCanvasElement[], offset: { x: number; y: number }, zoom: number) => {
    const visible = getVisibleTiles(offset, zoom, canvases[0].width, canvases[0].height)
    const visibleKeys = new Set(visible.map(t => t.key))
    lastVisibleKeys.current = visibleKeys

    const ctxs = canvases.map(canvas => canvas.getContext("2d"))
    if (ctxs.some(ctx => !ctx)) return

    for (let d = 0; d < canvases.length; d++) {
      const ctx = ctxs[d]!
      const buffers = visible
        .map(({ key }) => tileCache.current.get(`${key}:${d}`))
        .filter(Boolean) as { canvas: HTMLCanvasElement; frameStart: number; indexStart: number }[]

      drawFlatHeatmapFromBuffer(ctx, offset, zoom, buffers, CELL_SIZE, numFrames, numIndexes, selectedPoint || undefined)
    }

    queueVisibleTileFetches(visible)

    for (const key of tileCache.current.keys()) {
      const baseKey = key.split(":").slice(0, 2).join(":")
      if (!lastVisibleKeys.current.has(baseKey)) {
        tileCache.current.delete(key)
      }
    }
  }, [selectedPoint])

  const {
    mode, setMode, clickPosition, hoverPos, offsetRef, zoomRef, zoomIn, zoomOut, resetZoom, handleMouseDown,
    handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, handleKeyDown, downloadPNG, scheduleDraw }
    = useCanvasInteractions({ externalCanvasRefs: canvasRefs, draw })

  useEffect(() => {
    scheduleDraw()
  }, [selectedPoint])

  useEffect(() => {
    if (clickPosition) {
      const point = getPointFromCoordinates(clickPosition.x, clickPosition.y)
      const prevPoint = prevPointRef.current

      const pointChanged = point?.frame !== prevPoint?.frame || point?.index !== prevPoint?.index
      if (pointChanged) {
        if (point) {
          const values = getValueFromTileCache(point.frame, point.index)
          if (values !== undefined && values.every(v => v !== null)) {
            onPointSelect({ frame: point.frame, index: point.index })
            prevPointRef.current = point
          }
        }
        else {
          onPointSelect(null)
          prevPointRef.current = null

        }
      }
    }
  }, [clickPosition])

  useEffect(() => {
    if (hoverPos && showTooltips) {
      const point = getPointFromCoordinates(hoverPos.x, hoverPos.y)
      if (point) {
        const values = getValueFromTileCache(point.frame, point.index)
        if (values !== undefined) {
          setHoveredPoint({ ...point, values })
        }
      } else {
        setHoveredPoint(null)
      }
    }
  }, [hoverPos])

  function generateColorGradient(min = 0, max = 1, steps = 20) {
    const colorStops = Array.from({ length: steps }, (_, i) => {
      const value = min + ((max - min) * i) / (steps - 1)
      const percentage = (i / (steps - 1)) * 100
      return `${interpolator(value)} ${percentage}%`
    })
    return `linear-gradient(to top, ${colorStops.join(', ')})`
  }

  const getPointFromCoordinates = useCallback((xCoord: number, yCoord: number) => {
    const canvas = canvasRefs.current[0]
    if (!canvas) return null

    const zoomLevel = zoomRef.current
    const offset = offsetRef.current

    const x = (xCoord - offset.x) / zoomLevel
    const y = (yCoord - offset.y) / zoomLevel

    const frame = Math.floor(x / CELL_SIZE)
    const index = Math.floor(y / CELL_SIZE)

    if (frame < 0 || index < 0 || frame >= numFrames || index >= numIndexes) return null

    return { frame, index }
  }, [zoomRef, offsetRef, canvasRefs])

  function getValueFromTileCache(frame: number, index: number): number[] | undefined {
    const frameTile = Math.floor(frame / TILE_SIZE) * TILE_SIZE
    const indexTile = Math.floor(index / TILE_SIZE) * TILE_SIZE

    const values: number[] = []
    const i = frame - frameTile
    const j = index - indexTile

    for (let d = 0; d < dim; d++) {
      const key = `${frameTile}-${frameTile + TILE_SIZE}:${indexTile}-${indexTile + TILE_SIZE}:${d}`
      const tile = tileCache.current.get(key)
      if (!tile) return undefined


      values.push(tile.tile[i][j])
    }

    return values
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
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
      }

      {/* Canvas Container */}
      <div className="flex-1 relative min-h-0">
        <div className="w-full h-full border-2 border-gray-300 relative">
          <div className="flex flex-row h-full gap-2 border-2 border-gray-300 relative">
            {Array.from({ length: dim }).map((_, idx) => (
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
          {hoveredPoint && showTooltips && (
            <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm pointer-events-none">
              Point ({hoveredPoint.frame}, {hoveredPoint.index}): Slope X: {hoveredPoint.values[0].toFixed(2)}, Slope Y: {hoveredPoint.values[1].toFixed(2)}
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
                    20
                  ),
                }}></div>
              <div>{minValue.toFixed(2)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
