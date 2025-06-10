import { useRef, useState, useCallback, useEffect } from "react"

export type BarMode = "pan" | "select"

export interface Point {
  x: number
  y: number
}

export function useCanvasInteractions() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [mode, setMode] = useState<BarMode>("select")
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [clickPosition, setClickPosition] = useState<Point | null>(null)
  const [hoverPos, setHoverPos] = useState<Point | null>(null)

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

  // Zoom controls
  const zoomIn = () => setZoom(z => Math.min(z * 1.2, 10))
  const zoomOut = () => setZoom(z => Math.max(z / 1.2, 0.1))
  const resetZoom = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  // Pan
  const handlePan = useCallback((dx: number, dy: number) => {
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
  }, [])

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left)
    const y = (e.clientY - rect.top)
    const pt = { x, y }
    setDragStart(pt)
    setIsDragging(true)
    if (mode === "select") {
      setClickPosition(pt)
      console.log("Click position set:", pt)
    }

  }, [mode])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setHoverPos({ x, y })

    if (!isDragging || !dragStart) return

    const dx = x - dragStart.x
    const dy = y - dragStart.y

    if (mode === "pan") {
      handlePan(dx, dy)
      setDragStart({ x, y }) // continue dragging from current
    }
  }, [isDragging, dragStart, mode, handlePan])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragStart(null)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
    setDragStart(null)
  }, [])

  const handleMouseWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left)
    const mouseY = (e.clientY - rect.top)

    const zoomFactor = 1.1
    const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor

    // Get data-space coordinates before zoom
    const beforeZoomX = (mouseX - offset.x) / zoom
    const beforeZoomY = (mouseY - offset.y) / zoom

    const newZoom = Math.min(Math.max(zoom * delta, 0.1), 10)
    setZoom(newZoom)

    // Adjust offset to keep mouse position stable
    const newOffsetX = mouseX - beforeZoomX * newZoom
    const newOffsetY = mouseY - beforeZoomY * newZoom
    setOffset({ x: newOffsetX, y: newOffsetY })
  }, [zoom, offset])

  // Download PNG
  const downloadPNG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = "chart.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [])



  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
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
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // scale to device pixel ratio

      setCanvasSize({ width, height })
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas.parentElement!)

    return () => observer.disconnect()
  }, [])


  return {
    canvasRef,
    mode,
    zoom,
    offset,
    canvasSize,
    clickPosition,
    hoverPos,

    setMode,
    zoomIn,
    zoomOut,
    resetZoom,
    downloadPNG,

    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleMouseWheel
  }
}