import { useRef, useState, useCallback, useEffect } from "react"

export type BarMode = "pan" | "select"

export interface Point {
  x: number
  y: number
}

interface UseCanvasInteractionsProps {
  externalCanvasRefs: React.RefObject<(HTMLCanvasElement | null)[]>
  draw: (
    canvases: HTMLCanvasElement[],
    offset: { x: number, y: number },
    zoom: number
  ) => void
}

export function useCanvasInteractions({ externalCanvasRefs, draw }: UseCanvasInteractionsProps) {
  
  const drawRef = useRef(draw)

  useEffect(() => {
    drawRef.current = draw
  }, [draw])

  const canvasRefs = externalCanvasRefs
  const [mode, setMode] = useState<BarMode>("select")
  const zoomRef = useRef<number>(1)
  const offsetRef = useRef<Point>({ x: 0, y: 0 })
  const dragStartRef = useRef<Point | null>(null)
  const isDraggingRef = useRef(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [clickPosition, setClickPosition] = useState<Point | null>(null)
  const [hoverPos, setHoverPos] = useState<Point | null>(null)

  const animationFrameRef = useRef<number | null>(null)

  const scheduleDraw = () => {
    if (animationFrameRef.current == null) {
      animationFrameRef.current = requestAnimationFrame(() => {
        animationFrameRef.current = null
        requestDraw()
      })
    }
  }

  const requestDraw = useCallback(() => {
    const canvases = canvasRefs.current?.filter(Boolean) as HTMLCanvasElement[]
    if (!canvases?.length) return
    drawRef.current(canvases, offsetRef.current, zoomRef.current)
  }, [draw])

  const zoomIn = () => {
    zoomRef.current = Math.min(zoomRef.current * 1.1, 15)
    scheduleDraw()
  }

  const zoomOut = () => {
    zoomRef.current = Math.max(zoomRef.current / 1.1, 0.05)
    scheduleDraw()
  }

  const resetZoom = () => {
    offsetRef.current = { x: 0, y: 0 }
    zoomRef.current = 1
    scheduleDraw()
  }

  const getCanvasCoordinates = useCallback(
    (e: React.MouseEvent, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const targetCanvas = e.target as HTMLCanvasElement
    if (!targetCanvas) return
    const coords = getCanvasCoordinates(e, targetCanvas)
    dragStartRef.current = coords
    isDraggingRef.current = true

    if (mode === "select") {
      setClickPosition(coords)
    }

    requestDraw()
  }, [mode])

  const handleMouseUp = () => {
    isDraggingRef.current = false
    dragStartRef.current = null
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const targetCanvas = e.target as HTMLCanvasElement
    if (!targetCanvas) return
    const coords = getCanvasCoordinates(e, targetCanvas)
    setHoverPos(coords)

    if (isDraggingRef.current && dragStartRef.current && mode === "pan") {
      const dx = coords.x - dragStartRef.current.x
      const dy = coords.y - dragStartRef.current.y
      offsetRef.current.x += dx
      offsetRef.current.y += dy
      dragStartRef.current = coords
      scheduleDraw()
    }
  }

  const handleMouseLeave = () => {
    isDraggingRef.current = false
    dragStartRef.current = null
  }

  const handleMouseWheel = useCallback((e: React.WheelEvent) => {
    const targetCanvas = e.target as HTMLCanvasElement
    if (!targetCanvas) return

    if (e.shiftKey) {
      offsetRef.current.y -= e.deltaY
      requestDraw()
      return
    }

    if (e.altKey) {
      offsetRef.current.x -= e.deltaY
      requestDraw()
      return
    }

    const rect = targetCanvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left)
    const mouseY = (e.clientY - rect.top)

    const prevZoom = zoomRef.current
    const zoomFactor = 1.1
    const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor
    const newZoom = Math.min(Math.max(prevZoom * delta, 0.1), 10)

    const worldX = (mouseX - offsetRef.current.x) / prevZoom
    const worldY = (mouseY - offsetRef.current.y) / prevZoom

    zoomRef.current = newZoom
    offsetRef.current.x = mouseX - worldX * newZoom
    offsetRef.current.y = mouseY - worldY * newZoom

    requestDraw()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 50
    switch (e.key) {
      case "ArrowUp":
      case "w":
        offsetRef.current.y += step
        break
      case "ArrowDown":
      case "s":
        offsetRef.current.y -= step
        break
      case "ArrowLeft":
      case "a":
        offsetRef.current.x += step
        break
      case "ArrowRight":
      case "d":
        offsetRef.current.x -= step
        break
      default:
        return
    }
    scheduleDraw()
  }, [])

  const downloadPNG = useCallback(() => {
    canvasRefs.current?.forEach((canvas, index) => {
      if (!canvas) return
      const link = document.createElement("a")
      link.download = `canvas_${index}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    })
  }, [])

  const resizeCanvas = useCallback(() => {
    const canvases = canvasRefs.current?.filter(Boolean) as HTMLCanvasElement[]
    const n = canvases.length

    canvases.forEach(canvas => {
      const parent = canvas.parentElement
      if (!parent) return

      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      const width = (rect.width / n) * dpr
      const height = rect.height * dpr

      canvas.width = width
      canvas.height = height
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      setCanvasSize({ width, height })

      const ctx = canvas.getContext("2d")
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    })
  }, [])

  useEffect(() => {
    canvasRefs.current?.forEach(canvas => {
      if (!canvas) return
      const parent = canvas.parentElement
      if (!parent) return

      let resizeTimeout: ReturnType<typeof setTimeout> | null = null
      const resizeObserver = new ResizeObserver(() => {
        if (resizeTimeout) clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(() => {
          resizeCanvas()
          scheduleDraw()
        }, 6)
      })
      resizeObserver.observe(parent)

      return () => resizeObserver.disconnect()
    })
  }, [])

  return {
    mode,
    canvasSize,
    zoomRef,
    clickPosition,
    hoverPos,
    offsetRef,

    setMode,
    zoomIn,
    zoomOut,
    resetZoom,
    downloadPNG,

    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleMouseWheel,
    handleKeyDown,
    scheduleDraw,
    requestDraw
  }
}
