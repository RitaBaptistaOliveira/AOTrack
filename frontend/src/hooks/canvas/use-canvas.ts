import { useCanvasDraw } from "./use-canvas-draw"
import { useCanvasPanZoom } from "./use-canvas-pan-zoom"
import { useCanvasEvents } from "./use-canvas-events"
import { useCanvasResize } from "./use-canvas-resize"
import { useCanvasDownload } from "./use-canvas-download"
import { useEffect, useRef, useState, type RefObject } from "react"

export type BarMode = "pan" | "select"

export function useCanvas(externalCanvasRefs: RefObject<(HTMLCanvasElement | null)[]>, draw: any) {
    const [mode, setMode] = useState<BarMode>("select")
    const modeRef = useRef<BarMode>(mode)
    const zoomRef = useRef<number>(1)
    const offsetRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 })
    const { requestDraw, scheduleDraw } = useCanvasDraw(draw, externalCanvasRefs, offsetRef, zoomRef)
    const { zoomIn, zoomOut, reset } = useCanvasPanZoom(zoomRef, offsetRef, scheduleDraw)
    const { clickPosition, hoverPos, handleMouseDown, handleMouseUp, handleMouseMove, handleMouseLeave, handleKeyDown, handleMouseWheel } = useCanvasEvents(modeRef, offsetRef, zoomRef, scheduleDraw)
    useCanvasResize(externalCanvasRefs, scheduleDraw)
    const { downloadPNG } = useCanvasDownload(externalCanvasRefs)

    useEffect(() => {
        modeRef.current = mode
    }, [mode])

    return {
        mode,
        setMode,
        zoomRef,
        offsetRef,
        clickPosition,
        hoverPos,
        zoomIn,
        zoomOut,
        reset,
        downloadPNG,
        handleMouseDown,
        handleMouseUp,
        handleMouseMove,
        handleMouseLeave,
        handleKeyDown,
        handleMouseWheel,
        scheduleDraw,
        requestDraw
    }
}
