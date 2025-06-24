export function drawHeatmap(
    canvas: HTMLCanvasElement,
    offset: { x: number, y: number },
    zoom: number,

    data: number[][],
    numRows: number,
    numCols: number,
    selectedCell: { x: number; y: number } | null,
    interpolator: (t: number) => string,
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

export function generateHeatmapBuffer(
    data: number[][],
    numFrames: number,
    numIndexes: number,
    interpolator: (t: number) => string,
    canvasSize: { width: number, height: number }
): HTMLCanvasElement {
    let w
    let h
    let cellSize

    console.log("generateHeatmapBuffer called with:");
    console.log("canvasSize:", canvasSize);
    console.log("numFrames:", numFrames, "numIndexes:", numIndexes);

    if (canvasSize.width === 0 || canvasSize.height === 0) {
        w = numFrames
        h = numIndexes
        cellSize = 1
        console.log("Using default size (1px cells):", { w, h, cellSize });
    } else {
        cellSize = Math.floor(canvasSize.width / numFrames)
        w = cellSize * numFrames
        h = cellSize * numIndexes
        console.log("Calculated canvas size:", { cellSize, w, h });
    }

    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    console.log("Canvas created with size:", canvas.width, canvas.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        console.warn("Could not get canvas context!");
        return canvas;
    }

    for (let f = 0; f < numFrames; f++) {
        const x = f * cellSize
        for (let i = 0; i < numIndexes; i++) {
            const y = i * cellSize
            const value = data[f][i];
            ctx.fillStyle = interpolator(value);
            ctx.fillRect(x, y, cellSize, cellSize);
        }
    }
    console.log("Heatmap drawing complete.");
    return canvas;
}

export function generateSqueezedFlatHeatmapBuffer(
    data: number[][],
    numFrames: number,
    numIndexes: number,
    width: number,
    height: number,
    interpolator: (t: number) => string
): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    const cellWidth = width / numFrames;
    const cellHeight = height / numIndexes;

    for (let f = 0; f < numFrames; f++) {
        for (let i = 0; i < numIndexes; i++) {
            ctx.fillStyle = interpolator(data[f][i]);
            ctx.fillRect(f * cellWidth, i * cellHeight, cellWidth, cellHeight);
        }
    }

    return canvas;
}

export function drawFlatHeatmapFromBuffer(
    ctx: CanvasRenderingContext2D,
    offset: { x: number; y: number },
    zoom: number,
    buffer: HTMLCanvasElement | null,
    selected?: { frame: number; index: number; value: number }
) {
    if (!buffer || buffer.width === 0 || buffer.height === 0) return

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const offsetBufferX = (ctx.canvas.width - buffer.width) / 2
    ctx.setTransform(zoom, 0, 0, zoom, offset.x + offsetBufferX, offset.y);
    ctx.drawImage(buffer, 0, 0);

    if (selected) {
        const { frame, index } = selected
        ctx.save();
        ctx.strokeStyle = "#FF1493";
        ctx.lineWidth = 1
        const cellSize = Math.floor(buffer.width / 313)

        //Highlight the frame
        ctx.beginPath();
        ctx.rect(frame * cellSize, 0, cellSize, buffer.height);
        ctx.stroke();

        //Highlight the index
        ctx.beginPath();
        ctx.rect(0, index * cellSize, buffer.width, cellSize);
        ctx.stroke();

        ctx.restore();
    }

    ctx.restore();
}


export function drawFlatSqueezedHeatmap(
    ctx: CanvasRenderingContext2D,
    buffer: HTMLCanvasElement,
    canvasSize: { width: number; height: number }
) {
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(buffer, 0, 0, canvasSize.width, canvasSize.height);
}