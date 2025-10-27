import { useEffect, useRef, type RefObject} from "react"
import { getCellFromCoordinates } from "../utils/get-cell-from-coordinates.function"

export function useSelection(
  clickPosition: { x: number; y: number } | null,
  canvasRefs: RefObject<(HTMLCanvasElement | null)[]>,
  data: number[][][],
  numCols: number,
  numRows: number,
  offsetRef: { current: { x: number; y: number } },
  zoomRef: { current: number },
  onCellSelect: (cell: { frame: number; col: number; row: number } | null) => void,
  prevFrameRef: RefObject<number>
) {
  const prevSelectedCellRef = useRef<{ frame: number; col: number; row: number } | null>(null)

  useEffect(() => {
    if (!clickPosition) return

    const canvas = canvasRefs.current[0]
    if (!canvas) return
    const cell = getCellFromCoordinates(canvas, clickPosition.x, clickPosition.y, numCols, numRows, offsetRef, zoomRef)
    const prevCell = prevSelectedCellRef.current

    const cellChanged = cell?.col !== prevCell?.col || cell?.row !== prevCell?.row

    if (cellChanged) {
      if (cell) {
        const values = data.map(frame => frame[cell.col][cell.row])
        if (values.every(v => v !== null)) {
          onCellSelect({ frame: prevFrameRef.current, ...cell })
          prevSelectedCellRef.current = { frame: prevFrameRef.current, ...cell }
        }
      } else {
        onCellSelect(null)
        prevSelectedCellRef.current = null
      }
    }
  }, [clickPosition, data])
}
