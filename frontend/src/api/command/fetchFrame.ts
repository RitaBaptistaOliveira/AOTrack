export async function fetchFrame({
    frameIndex,
    loopIndex
}: {
    frameIndex: number
    loopIndex: number
}): Promise<{ frame: number[][] }> {
    const form = new FormData()
    form.append("frame_index", frameIndex.toString())
    form.append("loop_index", loopIndex.toString())

    const res = await fetch("http://localhost:8000/command/get-frame", {
        method: "POST",
        body: form,
        credentials: "include",
    })

    if (!res.ok) {
        throw new Error(`Title fetch failed: ${res.statusText}`)
    }

    return await res.json()
}
