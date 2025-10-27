import { useEffect, useState, type RefObject } from "react"
import { getPointFromCoordinates } from "../utils/get-point-from-coordinates.function"
import { getValueFromTileCache } from "../utils/get-value-from-tile-cache";

export function useHover(
    hoverPos: { x: number; y: number } | null,
    canvasRefs: RefObject<(HTMLCanvasElement | null)[]>,
    numFrames: number,
    numIndexes: number,
    dim: number,
    offsetRef: { current: { x: number; y: number } },
    zoomRef: { current: number },
    showTooltips: boolean,
    cellSize: number,
    tileSize: number,
    tileCache: React.RefObject<Map<string, { canvas: HTMLCanvasElement; frameStart: number; indexStart: number, tile: number[][] }>>
) {
    const [hoveredPoint, setHoveredPoint] = useState<{ frame: number, index: number, values: number[] } | null>(null)

    useEffect(() => {
        if (hoverPos && showTooltips) {
            const canvas = canvasRefs.current[0]
            if (!canvas) return
            const point = getPointFromCoordinates(hoverPos.x, hoverPos.y, numFrames, numIndexes, offsetRef, zoomRef, cellSize)
            if (point) {
                const values = getValueFromTileCache(point.frame, point.index, dim, tileSize, tileCache)
                if (values !== undefined && values.every(v => v !== null)) setHoveredPoint({ ...point, values })
                else setHoveredPoint(null)
            } else setHoveredPoint(null)
        } else setHoveredPoint(null)
    }, [hoverPos, tileCache, showTooltips])

    return hoveredPoint
}
