export async function fetchSlopeHistogram({
  wfsIndex,
  numBins,
  index
}: {
  wfsIndex: number
  numBins: number
  index?: number
}): Promise<{
  counts: [number[], number[]]
  bins: [number[], number[]]
  counts_point: [number[], number[]]
  bins_point: [number[], number[]]
}> {
  const formData = new FormData()
  formData.append("wfs_index", wfsIndex.toString())
  formData.append("num_bins", numBins.toString())

  if (index !== undefined) {
    formData.append("index", index.toString())
  }

  const res = await fetch("http://localhost:8000/slope/get-histogram", {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Slope histogram fetch failed: ${res.statusText}`)
  }

  return await res.json()
}
