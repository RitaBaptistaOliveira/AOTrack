import type { DataPoint } from "@/types/visualization"

export async function fetchPointStats({
  loopIndex,
  index
}: {
  loopIndex: number
  index: number
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
  formData.append("loop_index", loopIndex.toString())
  formData.append("index", index.toString())

  const res = await fetch("http://localhost:8000/command/get-point-stats", {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Point stats fetch failed: ${res.statusText}`)
  }
  const json = await res.json()
  return json
}
