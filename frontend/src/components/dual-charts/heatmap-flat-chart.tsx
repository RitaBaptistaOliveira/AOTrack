"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import ControlBar from "../controls/control-bar"
import { useChartInteraction } from "@/contexts/chart-interactions-context"

import { drawFlatHeatmapFromBuffer } from "@/utils"
import { fetchTile } from "@/api/slope/fetchTile"
import { useDualInteractions } from "@/hooks/use-dual-interactions"
import * as d3 from "d3"

const TILE_SIZE = 256
const CELL_SIZE = 6

interface FlatHeatmapProps {
  numFrames: number
  mask?: number[][] // Optional mask for subaperture
  numIndexes: number
  minValue: number
  maxValue: number
  onPointSelect: (point: { frame: number; x: number; y: number | undefined; values: [number, number] } | null) => void
  selectedCell: { frame: number, col: number, row: number, values: [number, number] } | null
}

export default function DualFlapHeatmap({
  numFrames,
  mask,
  numIndexes,
  minValue,
  maxValue,
  onPointSelect,
  selectedCell
}: FlatHeatmapProps) {
  const tileCache = useRef(new Map<string, { canvas: HTMLCanvasElement; frameStart: number; indexStart: number }>())
  const interpolator = d3.scaleSequential([minValue, maxValue], d3.interpolateViridis)
  const canvasRefs = useRef<[HTMLCanvasElement | null, HTMLCanvasElement | null]>([null, null])
  const requestedTiles = useRef(new Set<string>())
  const [selectedPoint, setSelectedPoint] = useState<{ frame: number, index: number, values: [number, number] } | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{ frame: number, index: number, values: [number, number] } | null>(null)
  const [showTooltips, setShowTooltips] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showControlBar, setShowControlBar] = useState(true)
  const prevPointRef = useRef<{ frame: number, index: number, values: [number, number] } | null>(null)
  const lastVisibleKeys = useRef<Set<string>>(new Set())
  const { intervalType, scaleType } = useChartInteraction()

  const pendingTiles = useRef<Set<string>>(new Set())

  const queueVisibleTileFetches = useCallback((tiles: ReturnType<typeof getVisibleTiles>) => {
    tiles.forEach(tile => {
      const key = tile.key
      if (!tileCache.current.has(key) && !requestedTiles.current.has(key)) {
        pendingTiles.current.add(key)
      }
    })
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const tilesToFetch = Array.from(pendingTiles.current)
      pendingTiles.current.clear()

      tilesToFetch.forEach((key) => {
        const [frameRange, indexRange] = key.split(":")
        const [frameStart, frameEnd] = frameRange.split("-").map(Number)
        const [indexStart, indexEnd] = indexRange.split("-").map(Number)

        fetchAndRenderTile(frameStart, frameEnd, indexStart, indexEnd)
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const getVisibleTiles = (
    offset: { x: number; y: number },
    zoom: number,
    width: number,
    height: number
  ) => {
    const frameStart = Math.floor(-offset.x / (CELL_SIZE * zoom * TILE_SIZE)) * TILE_SIZE
    const indexStart = Math.floor(-offset.y / (CELL_SIZE * zoom * TILE_SIZE)) * TILE_SIZE

    const cols = Math.ceil(width / (CELL_SIZE * zoom * TILE_SIZE)) + 1
    const rows = Math.ceil(height / (CELL_SIZE * zoom * TILE_SIZE)) + 1

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
    const keyX = `${frameStart}-${frameEnd}:${indexStart}-${indexEnd}:X`
    const keyY = `${frameStart}-${frameEnd}:${indexStart}-${indexEnd}:Y`
    if (tileCache.current.has(keyX) || tileCache.current.has(keyY)) return

    requestedTiles.current.add(keyX)
    requestedTiles.current.add(keyY)

    try {
      const json = await fetchTile({
        frameStart,
        frameEnd,
        indexStart,
        indexEnd,
        wfsIndex: 0,
        scaleType: scaleType,
        intervalType: intervalType
      })

      const tileDataX = json.tileX
      const tileDataY = json.tileY

      const canvasX = document.createElement("canvas")
      const canvasY = document.createElement("canvas")
      canvasX.width = tileDataX.length * CELL_SIZE
      canvasX.height = tileDataX[0].length * CELL_SIZE
      canvasY.width = tileDataY.length * CELL_SIZE
      canvasY.height = tileDataY[1].length * CELL_SIZE
      const ctxX = canvasX.getContext("2d")!
      const ctxY = canvasX.getContext("2d")!

      for (let i = 0; i < tileDataX.length; i++) {
        for (let j = 0; j < tileDataX[i].length; j++) {
          ctxX.fillStyle = interpolator(tileDataX[i][j])
          ctxX.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE)

          ctxY.fillStyle = interpolator(tileDataY[i][j])
          ctxY.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        }
      }

      tileCache.current.set(keyX, { canvas: canvasX, frameStart, indexStart })
      tileCache.current.set(keyY, { canvas: canvasY, frameStart, indexStart })
      requestDraw()
    } finally {
      requestedTiles.current.delete(keyX)
      requestedTiles.current.delete(keyY)
    }
  }

  const draw = useCallback((canvas: HTMLCanvasElement, offset: { x: number; y: number }, zoom: number) => {
    const index = canvasRefs.current.indexOf(canvas)
    if (index === -1) return
    let slope = ""
    if (index === 0) slope = ":X"
    else slope = ":Y"

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const visible = getVisibleTiles(offset, zoom, canvas.width, canvas.height)
    const visibleKeys = new Set(visible.map(t => t.key))
    lastVisibleKeys.current = visibleKeys

    const buffers = visible
      .map(({ key }) => tileCache.current.get(key + slope))
      .filter(Boolean) as { canvas: HTMLCanvasElement; frameStart: number; indexStart: number }[]

    drawFlatHeatmapFromBuffer(ctx, offset, zoom, buffers, CELL_SIZE, numFrames, numIndexes, selectedPoint || undefined)

    queueVisibleTileFetches(visible)

    for (const key of tileCache.current.keys()) {
      if (!lastVisibleKeys.current.has(key + slope)) {
        tileCache.current.delete(key + slope)
      }
    }
  }, [selectedPoint])

  const {
    mode, setMode, clickPosition, hoverPos, offsetRef, zoomRef, zoomIn, zoomOut, resetZoom, handleMouseDown,
    handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, handleKeyDown, downloadPNG, requestDraw }
    = useDualInteractions({ externalCanvasRef: canvasRefs, draw })

  useEffect(() => {
    if (selectedCell === null) {
      setSelectedPoint(null)
    } else {
      if (mask) {
        const { col, row } = selectedCell

        const index = mask[row]?.[col]
        if (index === undefined || index === -1) {
          console.warn("Invalid mask lookup at", row, col)
          setSelectedPoint(null)
          return
        }

        setSelectedPoint({
          frame: selectedCell.frame,
          index: index,
          values: selectedCell.values
        })
      } else {
        console.warn("No mask available in meta")
        setSelectedPoint(null)
      }
    }

  }, [selectedCell])

  useEffect(() => {
    if (clickPosition) {
      const point = getPointFromCoordinates(clickPosition.x, clickPosition.y)
      const prev = prevPointRef.current
      if (point) {
        if (prev === null || (point.frame !== prev.frame && point.index !== prev.index)) {
          const values = getValueFromTileCache(point.frame, point.index)
          if (values !== undefined && (prev === null || values !== prev.values)) {
            setSelectedPoint({ ...point, values })
            onPointSelect({ frame: point.frame, x: point.index, y: undefined, values: values })
          }
        }
      } else {
        setSelectedPoint(null)
        onPointSelect(null)
      }
    }
  }, [clickPosition])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestDraw()
    });
    return () => cancelAnimationFrame(id);
  }, [selectedPoint])

  function generateColorGradient(min = 0, max = 1, steps = 20) {
    const colorStops = Array.from({ length: steps }, (_, i) => {
      const value = min + ((max - min) * i) / (steps - 1)
      const t = (value - min) / (max - min)
      return `${interpolator(t)} ${t * 100}%`
    })
    return `linear-gradient(to top, ${colorStops.join(', ')})`
  }

  const getPointFromCoordinates = useCallback((canvasX: number, canvasY: number) => {
    const canvas = canvasRefs.current[1]
    if (!canvas) return null

    const zoomLevel = zoomRef.current
    const offset = offsetRef.current

    const x = (canvasX - offset.x) / zoomLevel
    const y = (canvasY - offset.y) / zoomLevel

    const frame = Math.floor(x / CELL_SIZE)
    const index = Math.floor(y / CELL_SIZE)

    if (frame < 0 || index < 0) return null

    return { frame, index }
  }, [zoomRef, offsetRef, canvasRefs])

  function getValueFromTileCache(frame: number, index: number): [number, number] | undefined {
    const frameTile = Math.floor(frame / TILE_SIZE) * TILE_SIZE
    const indexTile = Math.floor(index / TILE_SIZE) * TILE_SIZE
    const keyX = `${frameTile}-${frameTile + TILE_SIZE}:${indexTile}-${indexTile + TILE_SIZE}:X`
    const keyY = `${frameTile}-${frameTile + TILE_SIZE}:${indexTile}-${indexTile + TILE_SIZE}:Y`
    const tileX = tileCache.current.get(keyX)
    const tileY = tileCache.current.get(keyY)
    if (!tileX || !tileY) return undefined

    const i = frame - frameTile
    const j = index - indexTile
    const tileCanvasX = tileX.canvas
    const tileCanvasY = tileY.canvas

    const tileCtxX = tileCanvasX.getContext("2d")
    const tileCtxY = tileCanvasY.getContext("2d")
    if (!tileCtxX || !tileCtxY) return undefined

    const pixelX = tileCtxX.getImageData(j * CELL_SIZE, i * CELL_SIZE, 1, 1).data
    const pixelY = tileCtxY.getImageData(j * CELL_SIZE, i * CELL_SIZE, 1, 1).data

    const grayX = pixelX[0]
    const grayY = pixelY[1]
    return [grayX, grayY]
  }

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
