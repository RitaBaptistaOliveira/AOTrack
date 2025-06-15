import { useRef, useEffect } from "react";

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

export function generateHeatmapBuffer(
    data: number[][],
    numFrames: number,
    numIndexes: number,
    interpolator: (t: number) => string
): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = numFrames;
    canvas.height = numIndexes;

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    const imageData = ctx.createImageData(numFrames, numIndexes);
    const pixels = imageData.data;

    const hexToRGB = (hex: string): [number, number, number] => {
        const bigint = parseInt(hex.slice(1), 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };

    for (let f = 0; f < numFrames; f++) {
        for (let i = 0; i < numIndexes; i++) {
            const value = data[f][i];
            const [r, g, b] = hexToRGB(interpolator(value));
            const idx = (i * numFrames + f) * 4;
            pixels[idx] = r;
            pixels[idx + 1] = g;
            pixels[idx + 2] = b;
            pixels[idx + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
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
    canvasSize: { width: number; height: number },
    offset: { x: number; y: number },
    zoom: number,
    buffer: HTMLCanvasElement,
    selected?: { frame: number; index: number; value: number }
) {
    console.log(ctx, canvasSize, offset, zoom, buffer)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(zoom, 0, 0, zoom, offset.x, offset.y);
    ctx.drawImage(buffer, 0, 0);

    // Optional highlight
    if (selected) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1 / zoom;
        ctx.strokeRect(selected.frame, selected.index, 1, 1);
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

export function drawFlatHeatmap(
    canvas: HTMLCanvasElement,
    offset: { x: number; y: number }, // now optional
    zoom: number,                     // now optional
    data: number[][],
    numIndexes: number,
    numFrames: number,
    selectedPoint: { index: number; frame: number; value: number } | null,
    interpolator: (t: number) => string
) {
    console.log("DRAWW")
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const cellWidth = canvasWidth / numFrames;
    const cellHeight = canvasHeight / numIndexes;

    // Create buffer canvas matching canvas size
    const bufferCanvas = document.createElement("canvas");
    bufferCanvas.width = canvasWidth;
    bufferCanvas.height = canvasHeight;
    const bufferCtx = bufferCanvas.getContext("2d");
    if (!bufferCtx) return;

    const imageData = bufferCtx.createImageData(canvasWidth, canvasHeight);
    const pixels = imageData.data;

    const hexToRGB = (hex: string): [number, number, number] => {
        const bigint = parseInt(hex.slice(1), 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };

    // Fill each canvas pixel by mapping back to data indices
    for (let y = 0; y < canvasHeight; y++) {
        const index = Math.floor(y / cellHeight);
        for (let x = 0; x < canvasWidth; x++) {
            const frame = Math.floor(x / cellWidth);
            const value = data[frame]?.[index] ?? 0;
            const [r, g, b] = hexToRGB(interpolator(value));
            const i = (y * canvasWidth + x) * 4;
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
            pixels[i + 3] = 255;
        }
    }

    bufferCtx.putImageData(imageData, 0, 0);

    // Draw the heatmap at full canvas size
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(zoom, 0, 0, zoom, offset.x, offset.y);
    ctx.drawImage(bufferCanvas, 0, 0);

    // Optional: draw selected cell
    if (selectedPoint) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(
            selectedPoint.frame * cellWidth,
            selectedPoint.index * cellHeight,
            cellWidth,
            cellHeight
        );
    }
}