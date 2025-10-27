import { useEffect, useState, type RefObject } from "react"
import { getCellFromCoordinates } from "../utils/get-cell-from-coordinates.function"

export function useCellHover(
  hoverPos: { x: number; y: number } | null,
  canvasRefs: RefObject<(HTMLCanvasElement | null)[]>,
  numCols: number,
  numRows: number,
  data: number[][][],
  offsetRef: { current: { x: number; y: number } },
  zoomRef: { current: number },
  showTooltips: boolean
) {
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number; values: number[] } | null>(null)

  useEffect(() => {
    if (hoverPos && showTooltips) {
      const canvas = canvasRefs.current[0]
      if (!canvas) return
      const cell = getCellFromCoordinates(canvas, hoverPos.x, hoverPos.y, numCols, numRows, offsetRef, zoomRef)
      if (cell) {
        const values = data.map(frame => frame[cell.col][cell.row])
        if (values.every(v => v !== null)) setHoveredCell({ ...cell, values })
        else setHoveredCell(null)
      } else setHoveredCell(null)
    } else setHoveredCell(null)
  }, [hoverPos, data, showTooltips])

  return hoveredCell
}
