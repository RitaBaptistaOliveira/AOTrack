import * as d3 from "d3"
import type { DataPoint } from "../../common/utils/types"

export function generateKDE(data: number[], domain: [number, number], yMax: number): DataPoint[] {
  const [xStart, xEnd] = domain
  const xValues = d3.range(xStart, xEnd, (xEnd - xStart) / 100)
  const bandwidth = (xEnd - xStart) * 0.1
  const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), xValues)
  const rawKDE = kde(data)
  const scaleFactor = yMax / (d3.max(rawKDE, (d) => d.y) || 1)
  return rawKDE.map((d) => ({ x: d.x, y: Math.max(0, d.y * scaleFactor) }))
}

function kernelEpanechnikov(bandwidth: number) {
  return (v: number) => Math.abs((v /= bandwidth)) <= 1 ? (0.75 * (1 - v * v)) / bandwidth : 0
}

function kernelDensityEstimator(kernel: (v: number) => number, xValues: number[]) {
  return (sample: number[]) => {
    return xValues.map((x) => ({ x, y: d3.mean(sample, (v) => kernel(x - v))! }))
  }
}
