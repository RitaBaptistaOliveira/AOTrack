export type ColorMap = "viridis" | "greys" | "blues" | "reds" | "greens" | "rainbow" | "inferno"
export type ScaleType = "linear" | "log" | "sqrt" | "pow" | "squared" | "asinh" | "sinh" | "histequal" |  "logexp"
export type IntervalType = string | "zscale" | "minmax"

export interface HeatmapProps {
  frames: number[][][]
  metadata: {
    numFrames: number
    numRows: number
    numCols: number
  }
}
export interface TileBuffer {
  canvas: HTMLCanvasElement
  frameStart: number
  indexStart: number
}

export interface DataPoint {
  x: number
  y: number
}