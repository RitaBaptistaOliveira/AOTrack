export async function fetchHistogram({
  wfsIndex,
  numBins,
  col,
  row,
}: {
  wfsIndex: number
  numBins: number
  col?: number
  row?: number
}): Promise<{ counts: number[], bins: number[], counts1: number[], bins1: number[], }> {
  const formData = new FormData()
  formData.append("wfs_index", wfsIndex.toString())
  formData.append("num_bins", numBins.toString())

  if (col !== undefined && row !== undefined) {
    formData.append("col", col.toString())
    formData.append("row", row.toString())
  }

  const res = await fetch("http://localhost:8000/pixel/get-histogram", {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Histogram fetch failed: ${res.statusText}`)
  }

  const json = await res.json()
  return {
    counts: json.counts,
    bins: json.bins,
    counts1: json.counts1,
    bins1: json.bins1,

  }
}
