export async function fetchDefaultStats({ loopIndex }: { loopIndex: number }):
  Promise<{
    min: number
    max: number
    mean: number
    median: number
    std: number
    variance: number
  }> {
  const formData = new FormData()
  formData.append("loop_index", loopIndex.toString())

  const res = await fetch("http://localhost:8000/command/get-default-stats", {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Default command charts fetch failed: ${res.statusText}`)
  }

  return await res.json()
}
