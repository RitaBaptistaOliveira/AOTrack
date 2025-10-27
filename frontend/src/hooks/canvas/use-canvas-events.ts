import { useState, useRef, useCallback, type RefObject } from "react"

export function useCanvasEvents(
  modeRef: RefObject<"pan" | "select">,
  offsetRef: RefObject<{ x: number; y: number }>,
  zoomRef: RefObject<number>,
  scheduleDraw: () => void
) {
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log(modeRef.current)
    const coords = getCanvasCoordinates(e)
    dragStartRef.current = coords
    isDraggingRef.current = true

    if (modeRef.current === "select") setClickPosition(coords)

    scheduleDraw()
  }, [scheduleDraw])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
    dragStartRef.current = null
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e)
    setHoverPos(coords)

    if (isDraggingRef.current && dragStartRef.current && modeRef.current === "pan") {
      const dx = coords.x - dragStartRef.current.x
      const dy = coords.y - dragStartRef.current.y
      offsetRef.current.x += dx
      offsetRef.current.y += dy
      dragStartRef.current = coords
      scheduleDraw()
    }
  }, [getCanvasCoordinates, scheduleDraw])

  const handleMouseLeave = useCallback(() => {
    setHoverPos(null)
    isDraggingRef.current = false
    dragStartRef.current = null
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 50
    switch (e.key) {
      case "ArrowUp":
      case "w": offsetRef.current.y += step; break
      case "ArrowDown":
      case "s": offsetRef.current.y -= step; break
      case "ArrowLeft":
      case "a": offsetRef.current.x += step; break
      case "ArrowRight":
      case "d": offsetRef.current.x -= step; break
      default: return
    }
    scheduleDraw()
  }, [scheduleDraw])

  const handleMouseWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {

      if (e.shiftKey) {
        offsetRef.current.y -= e.deltaY
        scheduleDraw()
        return
      }

      if (e.altKey) {
        offsetRef.current.x -= e.deltaY
        scheduleDraw()
        return
      }

      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const prevZoom = zoomRef.current
      const zoomFactor = 1.1
      const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor
      const newZoom = Math.min(Math.max(prevZoom * delta, 0.1), 10)

      // Keep zoom centered under cursor
      const worldX = (mouseX - offsetRef.current.x) / prevZoom
      const worldY = (mouseY - offsetRef.current.y) / prevZoom

      zoomRef.current = newZoom
      offsetRef.current.x = mouseX - worldX * newZoom
      offsetRef.current.y = mouseY - worldY * newZoom

      scheduleDraw()
    },
    [scheduleDraw]
  )

  return {
    clickPosition,
    hoverPos,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleMouseLeave,
    handleKeyDown,
    handleMouseWheel
  }
}
