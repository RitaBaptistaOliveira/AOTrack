export async function fetchDefaultSlopeStats({
  wfsIndex
}: {
  wfsIndex: number
}): Promise<{
  min: [number, number]
  max: [number, number]
  mean: [number, number]
  median: [number, number]
  std: [number, number]
  variance: [number, number]
}> {
  const formData = new FormData()
  formData.append("wfs_index", wfsIndex.toString())

  const res = await fetch("http://localhost:8000/slope/get-default-stats", {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Default pixel charts fetch failed: ${res.statusText}`)
  }

  return await res.json()
}
