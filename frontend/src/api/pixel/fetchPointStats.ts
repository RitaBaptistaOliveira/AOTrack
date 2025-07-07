import type { DataPoint } from "@/types/visualization"

export async function fetchPointStats({
  wfsIndex,
  col,
  row,
  intervalType,
  scaleType,
}: {
  wfsIndex: number
  col: number
  row: number
  intervalType: string
  scaleType: string
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
  formData.append("col", col.toString())
  formData.append("row", row.toString())
  formData.append("interval_type", intervalType)
  formData.append("scale_type", scaleType)

  console.log("Fetching point stats with data:", {
    wfsIndex,
    col,
    row,
    intervalType,
    scaleType,
  })

  const res = await fetch("http://localhost:8000/pixel/get-point-stats", {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Point stats fetch failed: ${res.statusText}`)
  }
  const json = await res.json()
  console.log("Point stats fetched successfully:", json)
  return json
}
