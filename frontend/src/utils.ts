export function drawHeatmap(
    canvas: HTMLCanvasElement,
    offset: { x: number, y: number },
    zoom: number,

    data: number[][],
    numRows: number,
    numCols: number,
    selectedCell: { x: number; y: number } | null,
    interpolator: d3.ScaleSequential<string, never>
) {
    if (!data) {
        return
    }
    const squareSize = Math.min(canvas.width, canvas.height)
    const offsetX = (canvas.width - squareSize) / 2
    const offsetY = (canvas.height - squareSize) / 2

    const cellWidth = squareSize / numCols
    const cellHeight = squareSize / numRows

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(offsetX + offset.x, offsetY + offset.y)
    ctx.scale(zoom, zoom)

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            const value = data[row]?.[col]
            if (value === null || value === undefined) {
                // Don't draw or draw transparent
                continue;
            }
            ctx.fillStyle = interpolator(value)
            ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight)

        }
    }
    if (selectedCell) {
        ctx.strokeStyle = "#FF1493"
        ctx.lineWidth = 1
        ctx.strokeRect(selectedCell.x * cellWidth, selectedCell.y * cellHeight, cellWidth, cellHeight)
    }
    ctx.restore()
}
export function drawFlatHeatmapFromBuffer(
    ctx: CanvasRenderingContext2D,
    offset: { x: number; y: number },
    zoom: number,
    tileBuffers: {
        canvas: HTMLCanvasElement
        frameStart: number
        indexStart: number
    }[],
    cellSize: number = 6,
    numFrames: number,
    numIndexes: number,
    selected?: { frame: number; index: number } | null
) {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!tileBuffers || tileBuffers.length === 0) return

    ctx.save();
    ctx.imageSmoothingEnabled = false;


    ctx.setTransform(zoom, 0, 0, zoom, offset.x, offset.y);
    // Draw each tile using pre-rendered canvas
    for (const { canvas, frameStart, indexStart } of tileBuffers) {
        const x = frameStart * cellSize
        const y = indexStart * cellSize
        ctx.drawImage(canvas, x, y)
    }

    if (selected) {
        const { frame, index } = selected
        const x = frame * cellSize
        const y = index * cellSize
        ctx.save();
        ctx.strokeStyle = "#FF1493";
        ctx.lineWidth = 1 / zoom

        //Highlight the selected frame (vertical line)
        ctx.beginPath()
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, numIndexes * cellSize)
        ctx.stroke()

        // Highlight horizontal index line (entire width at this Y position)
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(numFrames * cellSize, y + 0.5)
        ctx.stroke()

        ctx.restore();
    }

    ctx.restore();
}
