import { useRef, useState, useCallback, useEffect } from "react"
export type BarMode = "pan" | "select"

export interface Point {
  x: number
  y: number
}

interface UseCanvasInteractionsProps<TDrawArgs> {
  externalCanvasRef: React.RefObject<HTMLCanvasElement | null>
  draw: (
    canvas: HTMLCanvasElement,
    offset: { x: number, y: number },
    zoom: number,
    drawArgs: TDrawArgs
  ) => void
  drawArgs: TDrawArgs
}

export function useInteractions<TDrawArgs>({
  externalCanvasRef,
  draw,
  drawArgs,
}: UseCanvasInteractionsProps<TDrawArgs>) {

  const canvasRef = externalCanvasRef ?? useRef<HTMLCanvasElement | null>(null)
  const [mode, setMode] = useState<BarMode>("select")
  const [zoom, setZoom] = useState(1)
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
    const canvas = canvasRef.current
    if (!canvas) return
    draw(canvas, offsetRef.current, zoom, drawArgs)
  }, [draw, zoom, drawArgs])

  // Zoom controls
  const zoomIn = () => setZoom(z => Math.min(z * 1.2, 10))
  const zoomOut = () => setZoom(z => Math.max(z / 1.2, 0.1))
  const resetZoom = () => {
    setZoom(1)
    offsetRef.current = { x: 0, y: 0 }
  }

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return
    dragStartRef.current = coords
    isDraggingRef.current = true
    if (mode === "select") {
      setClickPosition(coords)
    }

  }, [mode])

  const handleMouseUp = () => {
    isDraggingRef.current = false
    dragStartRef.current = null
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return
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
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left)
    const mouseY = (e.clientY - rect.top)

    const zoomFactor = 1.1
    const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor

    // Get data-space coordinates before zoom
    const beforeZoomX = (mouseX - offsetRef.current.x) / zoom
    const beforeZoomY = (mouseY - offsetRef.current.y) / zoom

    const newZoom = Math.min(Math.max(zoom * delta, 0.1), 10)
    setZoom(newZoom)

    // Adjust offset to keep mouse position stable
    offsetRef.current.x = mouseX - beforeZoomX * newZoom
    offsetRef.current.y = mouseY - beforeZoomY * newZoom
  }, [zoom])

  // Download PNG
  const downloadPNG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = "chart.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [])

  const getCanvasCoordinates = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const rect = parent.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const width = rect.width * dpr
    const height = rect.height * dpr

    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    canvas.width = width
    canvas.height = height
    setCanvasSize({ width, height })

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
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
  }, [])

  useEffect(() => {
    requestDraw()
  }, [zoom])


  return {
    mode,
    canvasSize,
    zoom,
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
    scheduleDraw,
    requestDraw
  }
}

export function useResizeCanvas(canvas: HTMLCanvasElement) {
  const parent = canvas.parentElement
  if (!parent) return
  const dpr = window.devicePixelRatio || 1
  const width = parent.clientWidth
  const height = parent.clientHeight

  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext("2d")
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

