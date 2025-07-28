export type ColorMap = "viridis" | "greys" | "blues" | "reds" | "greens" | "rainbow" | "inferno"
export type ScaleType = "linear" | "log" | "sqrt" | "squared" | "asinh" | "sinh" | "histequal" | "logexp"
export type IntervalType = "minmax" | "zscale" | `percentile-${number}`

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