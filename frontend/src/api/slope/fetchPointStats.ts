import type { DataPoint } from "@/types/visualization"

export async function fetchSlopePointStats({
  wfsIndex,
  index,
  dimension
}: {
  wfsIndex: number
  index: number
  dimension: number
}): Promise<{
  point_means: DataPoint[]
  stats: {
    min: number
    max: number
    mean: number
    median: number
    std: number
    variance: number
  }
}> {
  const formData = new FormData()
  formData.append("wfs_index", wfsIndex.toString())
  formData.append("index", index.toString())
  formData.append("dimension", dimension.toString())

  const res = await fetch("http://localhost:8000/slope/get-point-stats", {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Slope point stats fetch failed: ${res.statusText}`)
  }

  return await res.json()
}
