import type { DataPoint } from "@/types/visualization"

export async function fetchSlopePointStats({
  wfsIndex,
  index,
  intervalType,
  scaleType,
}: {
  wfsIndex: number
  index: number
  intervalType: string
  scaleType: string
}): Promise<{
  point_means: [DataPoint[], DataPoint[]]
  stats: {
    min: [number, number]
    max: [number, number]
    mean: [number, number]
    median: [number, number]
    std: [number, number]
    variance: [number, number]
  }
}> {
  const formData = new FormData()
  formData.append("wfs_index", wfsIndex.toString())
  formData.append("index", index.toString())
  formData.append("interval_type", intervalType)
  formData.append("scale_type", scaleType)

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
