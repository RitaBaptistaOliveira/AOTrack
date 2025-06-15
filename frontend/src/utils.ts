export function drawHeatmap(
    canvas: HTMLCanvasElement,
    offset: { x: number, y: number },
    zoom: number,

    data: number[][],
    numRows: number,
    numCols: number,
    selectedCell: { x: number; y: number } | null,
    interpolator: (t: number) => string
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

export function drawFlatHeatmap(
    canvas: HTMLCanvasElement,
    offset: { x: number, y: number },
    zoom: number,

    data: number[][],
    numIndexes: number,
    numFrames: number,
    selectedPoint: { index: number; frame: number; value: number } | null,
    interpolator: (t: number) => string
) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Render at zoomed resolution
    const renderWidth = Math.floor(canvasWidth * zoom);
    const renderHeight = Math.floor(canvasHeight * zoom);

    const cellWidth = renderWidth / numFrames;
    const cellHeight = renderHeight / numIndexes;

    // Prepare image data at zoomed resolution
    const imageData = new ImageData(renderWidth, renderHeight);
    const buffer = imageData.data;

    const hexToRGB = (hex: string) => {
        const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (!match) return [0, 0, 0];
        return [
            parseInt(match[1], 16),
            parseInt(match[2], 16),
            parseInt(match[3], 16),
        ];
    };

    for (let y = 0; y < renderHeight; y++) {
        const index = Math.floor(y / cellHeight);
        for (let x = 0; x < renderWidth; x++) {
            const frame = Math.floor(x / cellWidth);
            const value = data[frame]?.[index];
            if (value === undefined) continue;

            const [r, g, b] = hexToRGB(interpolator(value));
            const i = (y * renderWidth + x) * 4;
            buffer[i] = r;
            buffer[i + 1] = g;
            buffer[i + 2] = b;
            buffer[i + 3] = 255;
        }
    }

    // Offscreen canvas to draw the bitmap
    const offscreen = document.createElement("canvas");
    offscreen.width = renderWidth;
    offscreen.height = renderHeight;

    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;
    offCtx.putImageData(imageData, 0, 0);

    // Main draw
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();

    //  Apply offset and draw the scaled image to screen
    ctx.translate(offset.x, offset.y);
    ctx.drawImage(offscreen, 0, 0, renderWidth, renderHeight, 0, 0, renderWidth, renderHeight);

    ctx.restore();
}