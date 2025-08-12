export async function fetchTile({
    frameStart,
    frameEnd,
    indexStart,
    indexEnd,
    loopIndex = 0
}: {
    frameStart: number
    frameEnd: number
    indexStart: number
    indexEnd: number
    loopIndex: number
}): Promise<{ tile: number[][] }> {
    const form = new FormData()
    form.append("frame_start", frameStart.toString())
    form.append("frame_end", frameEnd.toString())
    form.append("index_start", indexStart.toString())
    form.append("index_end", indexEnd.toString())
    form.append("loop_index", loopIndex.toString())

    const res = await fetch("http://localhost:8000/command/tile", {
        method: "POST",
        body: form,
        credentials: "include",
    })

    if (!res.ok) {
        throw new Error(`Title fetch failed: ${res.statusText}`)
    }
    return await res.json()
}
