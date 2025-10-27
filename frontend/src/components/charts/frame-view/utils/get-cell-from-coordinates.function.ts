export function getCellFromCoordinates(
    canvas: HTMLCanvasElement,
    x: number,
    y: number,
    numCols: number,
    numRows: number,
    offsetRef: { current: { x: number; y: number } },
    zoomRef: { current: number }
) {
    const zoomLevel = zoomRef.current
    const offset = offsetRef.current
    
    const squareSize = Math.min(canvas.width, canvas.height)
    const offsetX = (canvas.width - squareSize) / 2
    const offsetY = (canvas.height - squareSize) / 2

    const adjustedX = x - offsetX
    const adjustedY = y - offsetY

    const dataX = (adjustedX - offset.x) / zoomLevel
    const dataY = (adjustedY - offset.y) / zoomLevel

    const col = Math.floor(dataX / (squareSize / numCols))
    const row = Math.floor(dataY / (squareSize / numRows))

    if (col >= 0 && col < numCols && row >= 0 && row < numRows) return { col, row }
    return null
}