import { useCallback, type RefObject } from "react"

export function useCanvasPanZoom(zoomRef: RefObject<number>, offsetRef: RefObject<{ x: number; y: number }>, scheduleDraw: () => void) {

  const zoomIn = useCallback(() => {
    zoomRef.current = Math.min(zoomRef.current * 1.1, 15)
    scheduleDraw()
  }, [])

  const zoomOut = useCallback(() => {
    zoomRef.current = Math.max(zoomRef.current / 1.1, 0.05)
    scheduleDraw()
  }, [])

  const reset = useCallback(() => {
    offsetRef.current = { x: 0, y: 0 }
    zoomRef.current = 1
    scheduleDraw()
  }, [])

  return { zoomIn, zoomOut, reset }
}
