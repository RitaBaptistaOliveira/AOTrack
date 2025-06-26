import type { DataPoint } from "@/types/visualization"

export async function fetchDefaultSlopeCharts({
  wfsIndex
}: {
  wfsIndex: number
}): Promise<{
  frame_means_x: DataPoint[]
  frame_means_y: DataPoint[]
  min: number
  max: number
  mean: number
  median: number
  std: number
  variance: number
}> {
  const formData = new FormData()
  formData.append("wfs_index", wfsIndex.toString())

  const res = await fetch("http://localhost:8000/slope/get-default-slope-charts", {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Default pixel charts fetch failed: ${res.statusText}`)
  }

  return await res.json()
}
