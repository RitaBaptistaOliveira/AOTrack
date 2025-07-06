export async function fetchDefaultStats({ wfsIndex }: { wfsIndex: number }):
  Promise<{
    min: number
    max: number
    mean: number
    median: number
    std: number
    variance: number
  }> {
  const formData = new FormData()
  formData.append("wfs_index", wfsIndex.toString())

  const res = await fetch("http://localhost:8000/pixel/get-default-stats", {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Default pixel charts fetch failed: ${res.statusText}`)
  }

  return await res.json()
}
