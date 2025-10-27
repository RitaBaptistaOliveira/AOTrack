import * as d3 from "d3"

export function calculateStatistics(data: number[]) {
  if (data.length === 0) return { min: 0, mean: 0, max: 0 }

  const min = d3.min(data) || 0
  const mean = d3.mean(data) || 0
  const max = d3.max(data) || 0
  return { min, mean, max }
}