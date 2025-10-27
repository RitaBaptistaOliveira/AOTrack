import { useEffect } from "react"

export function useCanvasResize(
    canvasRefs: React.RefObject<(HTMLCanvasElement | null)[]>,
    scheduleDraw: () => void
) {
    useEffect(() => {
        const canvases = canvasRefs.current?.filter(Boolean) as HTMLCanvasElement[]
        const numCanvas = canvases.length
        canvases.forEach(canvas => {
            const parent = canvas.parentElement
            if (!parent) return

            let resizeTimeout: ReturnType<typeof setTimeout> | null = null

            const resizeObserver = new ResizeObserver(() => {
                if (resizeTimeout) clearTimeout(resizeTimeout)
                resizeTimeout = setTimeout(() => {
                    const rect = parent.getBoundingClientRect()
                    const dpr = window.devicePixelRatio || 1
                    const width = (rect.width / numCanvas) * dpr
                    const height = rect.height * dpr

                    canvas.width = width
                    canvas.height = height
                    canvas.style.width = `${rect.width}px`
                    canvas.style.height = `${rect.height}px`
                    
                    const ctx = canvas.getContext("2d")
                    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
                    scheduleDraw()
                }, 50)
            })
            resizeObserver.observe(parent)
        })
    }, [scheduleDraw])
}
