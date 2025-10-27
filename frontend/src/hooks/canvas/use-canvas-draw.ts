import { useRef, useCallback, type RefObject } from "react"

export function useCanvasDraw(
    draw: (
        canvases: HTMLCanvasElement[],
        offset: { x: number; y: number },
        zoom: number
    ) => void,
    canvasRefs: RefObject<(HTMLCanvasElement | null)[]>,
    offsetRef: RefObject<{ x: number; y: number }>,
    zoomRef: RefObject<number>,
) {
    const drawRef = useRef(draw)
    const animationFrameRef = useRef<number | null>(null)

    drawRef.current = draw

    const requestDraw = useCallback(() => {
        const canvases = canvasRefs.current?.filter(Boolean) as HTMLCanvasElement[]
        if (!canvases?.length) return
        drawRef.current(canvases, offsetRef.current, zoomRef.current)
    }, [])

    const scheduleDraw = useCallback(() => {
        if (animationFrameRef.current == null) {
            animationFrameRef.current = requestAnimationFrame(() => {
                animationFrameRef.current = null
                requestDraw()
            })
        }
    }, [requestDraw])

    return { requestDraw, scheduleDraw }
}
