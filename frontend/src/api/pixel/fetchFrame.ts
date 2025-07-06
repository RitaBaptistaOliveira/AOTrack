export async function fetchFrame({
    frameIndex,
    wfsIndex,
    scaleType,
    intervalType
}: {
    frameIndex: number
    wfsIndex: number
    scaleType: string
    intervalType: string
}): Promise<{ frame: number[][] }> {
    const form = new FormData()
    form.append("frame_index", frameIndex.toString())
    form.append("wfs_index", wfsIndex.toString())
    form.append("interval_type", intervalType)
    form.append("scale_type", scaleType)

    const res = await fetch("http://localhost:8000/pixel/get-frame", {
        method: "POST",
        body: form,
        credentials: "include",
    })

    if (!res.ok) {
        throw new Error(`Title fetch failed: ${res.statusText}`)
    }

    return await res.json()
}
