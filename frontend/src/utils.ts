import type { MetadataSummary } from "./types/metadata_summary";

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

export function parseMetadata(raw: any): MetadataSummary {
  return {
    telescope_name: raw.telescope_name ?? null,
    system_name: raw.system_name ?? null,
    mode: raw.mode ?? null,
    start_date: raw.start_date ?? null,
    end_date: raw.end_date ?? null,
    recording_time: raw.recording_time ?? null,
    strehl_ratio: raw.strehl_ratio ?? null,
    config: raw.config ?? null,
    strehl_wavelength: raw.strehl_wavelength ?? null,

    num_params: raw.num_params ?? 0,
    atmospheric_parameters: (raw.atmospheric_parameters ?? []).map((ap: any) => ({
      uid: ap.uid,
      time: ap.time
        ? {
          timestamps: ap.time.timestamps,
          frame_numbers: ap.time.frame_numbers,
        }
        : null,
    })),

    num_wfs: raw.num_wfs ?? 0,
    wavefront_sensors: (raw.wavefront_sensors ?? []).map((wfs: any) => ({
      uid: wfs.uid,
      source: wfs.source ? { uid: wfs.source.uid } : null,
      n_valid_subapertures: wfs.n_valid_subapertures,
      subaperture_size: wfs.subaperture_size,
      wavelength: wfs.wavelength,
    })),

    num_correctors: raw.num_correctors ?? 0,
    wavefront_correctors: (raw.wavefront_correctors ?? []).map((wfc: any) => ({
      uid: wfc.uid,
      telescope: wfc.telescope ?? null,
      n_valid_actuators: wfc.n_valid_actuators,
    })),

    num_loops: raw.num_loops ?? 0,
    loops: (raw.loops ?? []).map((loop: any) => ({
      uid: loop.uid,
      wfc: loop.wfc ?? null,
      closed: loop.closed,
      time: loop.time
        ? {
          timestamps: loop.time.timestamps,
          frame_numbers: loop.time.frame_numbers,
        }
        : null,
      framerate: loop.framerate,
      delay: loop.delay,
    })),

    num_sources: raw.num_sources ?? 0,
    sources: (raw.sources ?? []).map((src: any) => ({
      uid: src.uid,
    })),
  }
}