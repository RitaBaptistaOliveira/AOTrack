import type { MetadataSummary } from "./types/metadata_summary"
import { themeColorMap } from "./utils/color-themes"
import type { ColorMap } from "./types/visualization"
const WLINE = 4

export function drawHeatmap(
  canvas: HTMLCanvasElement,
  offset: { x: number, y: number },
  zoom: number,
  data: number[][],
  numRows: number,
  numCols: number,
  selectedCell: { col: number; row: number } | null,
  scale: (value: number) => string,
  colormap: ColorMap = "viridis"
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
      const value = data[col]?.[row]
      if (value === null || value === undefined) {
        continue;
      }
      ctx.fillStyle = scale(value)
      ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight)

    }
  }

  if (selectedCell) {
    const { col, row } = selectedCell
    const selX = col * cellWidth
    const selY = row * cellHeight
    const value = data[col]?.[row]

    if (value !== undefined && value !== null) {
      const themeColor = themeColorMap[colormap].main || "#000"
      const w =  Math.max(WLINE / zoom, 1)
      const adjustedW = w / 2
      ctx.lineWidth = w
      ctx.strokeStyle = themeColor
      ctx.strokeRect(selX - adjustedW, selY - adjustedW, cellWidth + adjustedW, cellHeight + adjustedW)
    }
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
  selected?: { frame: number; index: number } | null,
  colormap: ColorMap = "viridis"
) {
  const canvas = ctx.canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!tileBuffers || tileBuffers.length === 0) return

  ctx.save()
  ctx.imageSmoothingEnabled = false


  ctx.setTransform(zoom, 0, 0, zoom, offset.x, offset.y)

  for (const { canvas, frameStart, indexStart } of tileBuffers) {
    const x = frameStart * cellSize
    const y = indexStart * cellSize
    ctx.drawImage(canvas, x, y)
  }

  if (selected) {
    const { frame, index } = selected
    const selX = frame * cellSize
    const selY = index * cellSize
    const w = Math.max(WLINE / zoom, 1)
    const adjustedW = w / 2


    const themeColor = themeColorMap[colormap].main || "#000"
    ctx.lineWidth = w
    ctx.strokeStyle = themeColor

    ctx.strokeRect(selX - adjustedW, 0, cellSize + adjustedW, numIndexes * cellSize)
    ctx.strokeRect(0, selY - adjustedW, numFrames * cellSize, cellSize + adjustedW)
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
