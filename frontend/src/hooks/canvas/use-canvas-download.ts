import type { RefObject } from "react"

export function useCanvasDownload(canvasRefs: RefObject<(HTMLCanvasElement | null)[]>) {
  const downloadPNG = () => {
    canvasRefs.current?.forEach((canvas, index) => {
      if (!canvas) return
      const link = document.createElement("a")
      link.download = `canvas_${index}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    })
  }

  return { downloadPNG }
}
