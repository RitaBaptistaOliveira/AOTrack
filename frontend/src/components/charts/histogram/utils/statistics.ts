import * as d3 from "d3"

export function calculateStatistics(data: number[]) {
  if (data.length === 0) return { mean: 0, median: 0 }

  const mean = d3.mean(data) || 0
  const median = d3.median(data) || 0
  return { mean, median }
}