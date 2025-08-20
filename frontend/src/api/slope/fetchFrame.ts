export async function fetchFrame({
    frameIndex,
    wfsIndex
}: {
    frameIndex: number
    wfsIndex: number
    scaleType: string
    intervalType: string
}): Promise<{ frameX: number[][], frameY: number[][] }> {
    const form = new FormData()
    form.append("frame_index", frameIndex.toString())
    form.append("wfs_index", wfsIndex.toString())

    const res = await fetch("http://localhost:8000/slope/get-frame", {
        method: "POST",
        body: form,
        credentials: "include",
    })

    if (!res.ok) {
        throw new Error(`Title fetch failed: ${res.statusText}`)
    }

    return await res.json()
}
