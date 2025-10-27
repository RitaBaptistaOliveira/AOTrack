import { useRef, useEffect, useState, useCallback } from "react"
import TimelineViewHeader from "./TimelineViewHeader"
import TimelineViewCanvas from "./TimelineViewCanvas"
import HeatmapLegend from "../common/HeatmapLegend"

import ControlBar from "../../controls/control-bar"

import { useTileCache } from "./hooks/use-tile-cache"
import { useHover } from "./hooks/use-hover"
import { useSelection } from "./hooks/use-selection"

import { useCanvas } from "@/hooks/canvas/use-canvas"
import * as d3 from "d3"
import { drawFlatHeatmapFromBuffer } from "@/utils"
import { generateColorGradient } from "./utils/generate-color-gradient.function"

const TILE_SIZE = 256
const CELL_SIZE = 6
const TILE_EVICT_MS = 10 * 1000 // 10 seconds

interface TimelineViewProps {
    numFrames: number
    numIndexes: number
    dim: number
    minValue: number
    maxValue: number
    onPointSelect: (point: { frame: number, index: number } | null) => void
    onFetchTile: (frameStart: number, frameEnd: number, indexStart: number, indexEnd: number) => Promise<number[][][]>
    onFrameChange: (frame: number) => void
    selectedPoint: { frame: number, index: number } | null
    formatHover: (point: { frame: number, index: number, values: number[] }) => React.ReactNode
}

export default function TimelineView({
    numFrames,
    numIndexes,
    dim,
    minValue,
    maxValue,
    onPointSelect,
    onFetchTile,
    onFrameChange,
    selectedPoint,
    formatHover
}: TimelineViewProps) {
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
    const [showTooltips, setShowTooltips] = useState(true)
    const [showLegend, setShowLegend] = useState(true)
    const [showControlBar, setShowControlBar] = useState(true)

    const interpolator = d3.scaleSequential([minValue, maxValue], d3.interpolateViridis)
    const gradientStops = generateColorGradient(minValue, maxValue, undefined, interpolator)

    const { tileCache, queueTiles, cacheVersion } = useTileCache(dim, CELL_SIZE, interpolator, onFetchTile)

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

    const updateVisibleTiles = (offset: { x: number; y: number }, zoom: number, width: number, height: number) => {
        const tiles = getVisibleTiles(offset, zoom, width, height)
        queueTiles(tiles)
        return tiles
    }

    const drawFn = useCallback((canvases: HTMLCanvasElement[], offset: { x: number; y: number }, zoom: number) => {
        const visibleTiles = updateVisibleTiles(offset, zoom, canvases[0].width, canvases[0].height)
        const ctxs = canvases.map(canvas => canvas.getContext("2d"))
        if (ctxs.some(ctx => !ctx)) return
        for (let d = 0; d < canvases.length; d++) {
            const ctx = ctxs[d]!
            const buffers = visibleTiles
                .map(({ key }) => {
                    const tile = tileCache.current.get(`${key}:${d}`)
                    if (tile) {
                        (tile as any).lastUsed = Date.now()
                    }
                    return tile
                })
                .filter(tile => tile && tile.canvas && tile.canvas.width > 0 && tile.canvas.height > 0) as { canvas: HTMLCanvasElement; frameStart: number; indexStart: number }[]
            drawFlatHeatmapFromBuffer(ctx, offset, zoom, buffers, CELL_SIZE, numFrames, numIndexes, selectedPoint || undefined)
        }

        const now = Date.now()
        for (const [key, tile] of tileCache.current.entries()) {
            const lastUsed = (tile as any).lastUsed || 0
            if (now - lastUsed > TILE_EVICT_MS) {
                tileCache.current.delete(key)
            }
        }

    }, [selectedPoint])

    const { mode, setMode, clickPosition, hoverPos, offsetRef, zoomRef, zoomIn, zoomOut, reset, handleMouseDown,
        handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, handleKeyDown, downloadPNG, scheduleDraw }
        = useCanvas(canvasRefs, drawFn)

    const hoveredPoint = useHover(hoverPos, canvasRefs, numFrames, numIndexes, dim, offsetRef, zoomRef, showTooltips, CELL_SIZE, TILE_SIZE, tileCache)
    useSelection(clickPosition, canvasRefs, dim, numFrames, numIndexes, offsetRef, zoomRef, onPointSelect, onFrameChange, CELL_SIZE, TILE_SIZE, tileCache)

    useEffect(() => {
        scheduleDraw()
    }, [cacheVersion, selectedPoint])

    return (
        <div className="h-full flex flex-col">
            <TimelineViewHeader
                showControlBar={showControlBar}
                setShowControlBar={setShowControlBar}
            />

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
                    onResetZoom={reset}
                    onDownloadPNG={downloadPNG}
                />
            }

            {/* Canvas Container */}
            <div className="flex-1 relative min-h-0">
                <div className="w-full h-full border-2 border-gray-300 relative">
                    <div className="flex flex-row h-full gap-2 border-2 border-gray-300 relative">
                        <TimelineViewCanvas
                            dim={dim}
                            canvasRefs={canvasRefs}
                            handleMouseDown={handleMouseDown}
                            handleMouseMove={handleMouseMove}
                            handleMouseUp={handleMouseUp}
                            handleMouseLeave={handleMouseLeave}
                            handleMouseWheel={handleMouseWheel}
                            handleKeyDown={handleKeyDown}
                            mode={mode}
                        />
                    </div>
                    {hoveredPoint && showTooltips && <div>{formatHover(hoveredPoint)}</div>}

                    {showLegend && <HeatmapLegend minValue={minValue} maxValue={maxValue} gradientStops={gradientStops} />}
                </div>
            </div>
        </div>
    )
}
