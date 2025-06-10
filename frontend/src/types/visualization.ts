export type ColorMap = "viridis" | "greys" | "blues" | "reds" | "greens" | "rainbow" | "inferno"
export type ScaleType = "linear" | "log" | "sqrt" | "pow" | "squared" | "asinh" | "sinh" | "histequal" |  "logexp"
export type IntervalType = "percentile" | "zscale" | "minmax"

export interface HeatmapProps {
  frames: number[][][]
  metadata: {
    numFrames: number
    numRows: number
    numCols: number
  }
}