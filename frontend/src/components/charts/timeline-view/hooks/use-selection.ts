import { useEffect, useRef, type RefObject } from "react"
import { getPointFromCoordinates } from "../utils/get-point-from-coordinates.function";
import { getValueFromTileCache } from "../utils/get-value-from-tile-cache";
export function useSelection(
  clickPosition: { x: number; y: number } | null,
  canvasRefs: RefObject<(HTMLCanvasElement | null)[]>,
  dim: number,
  numFrames: number,
  numIndexes: number,
  offsetRef: { current: { x: number; y: number } },
  zoomRef: { current: number },
  onPointSelect: (point: { frame: number, index: number } | null) => void,
  onFrameChange: (frame: number) => void,
  cellSize: number,
  tileSize: number,
  tileCache: RefObject<Map<string, { canvas: HTMLCanvasElement; frameStart: number; indexStart: number, tile: number[][] }>>
) {
  const prevSelectedPointRef = useRef<{ frame: number, index: number } | null>(null)

  useEffect(() => {
    if (!clickPosition) return

    const canvas = canvasRefs.current[0]
    if (!canvas) return

    const point = getPointFromCoordinates(clickPosition.x, clickPosition.y, numFrames, numIndexes, offsetRef, zoomRef, cellSize)
    const prevPoint = prevSelectedPointRef.current

    const isDiffFrame = point?.frame !== prevPoint?.frame
    const isDiffIndex = point?.index !== prevPoint?.index
    console.log("Selection changed:", { point, prevPoint, isDiffFrame, isDiffIndex })
    if (point && isDiffFrame && !isDiffIndex) {
      onFrameChange(point.frame)
      prevSelectedPointRef.current = point
      return
    }

    if (isDiffFrame || isDiffIndex) {
      if (point) {
        const values = getValueFromTileCache(point.frame, point.index, dim, tileSize, tileCache)
        if (values !== undefined && values.every(v => v !== null)) {
          onPointSelect({ frame: point.frame, index: point.index })
          prevSelectedPointRef.current = point
        }
      } else {
        onPointSelect(null)
        prevSelectedPointRef.current = null
      }
    }
  }, [clickPosition, tileCache])
}
