export function drawHeatmap(
    canvas: HTMLCanvasElement,
    canvasSize: { width: number, height: number },
    offset: { x: number, y: number },
    zoom: number,
    
    currentFrame: number,
    data: number[][],
    numRows: number,
    numCols: number,
    selectedCell: { x: number; y: number } | null,
    interpolator: (t: number) => string
) {
    console.log("Canvas: ",canvas)
    const frameData = data[currentFrame]
    if (!frameData) return
    const squareSize = Math.min(canvasSize.width, canvasSize.height)
    const offsetX = (canvasSize.width - squareSize) / 2
    const offsetY = (canvasSize.height - squareSize) / 2

    const cellWidth = squareSize / numCols
    const cellHeight = squareSize / numRows

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    ctx.save()
    ctx.translate(offsetX + offset.x, offsetY + offset.y)
    ctx.scale(zoom, zoom)

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            const value = data[row]?.[col]
            if (value !== undefined) {
                ctx.fillStyle = interpolator(value)
                ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight)
            }
        }
    }
    if (selectedCell) {
        ctx.strokeStyle = "#FF1493"
        ctx.lineWidth = 1
        ctx.strokeRect(selectedCell.x * cellWidth, selectedCell.y * cellHeight, cellWidth, cellHeight)
    }
    ctx.restore()
}