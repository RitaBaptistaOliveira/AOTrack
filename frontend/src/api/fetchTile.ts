/**
 * Fetches a tile of frame data for a given page (command, pixel, slope).
 *
 * A tile corresponds to a rectangular block of data spanning a range of frames
 * (`frameStart` → `frameEnd`) and indices (`indexStart` → `indexEnd`).
 * The returned data shape depends on the type parameter `T`:
 * - `number[][]`: A 2D tile of values (single index across frames).
 * - `number[][][]`: A 3D tile of values (multiple indices across frames).
 *
 * @typeParam T The shape of the returned tile (2D or 3D numeric array).
 *
 * @param {Object} params - The parameters for the request.
 * @param {number} params.frameStart - The starting frame index (inclusive).
 * @param {number} params.frameEnd - The ending frame index (inclusive).
 * @param {number} params.indexStart - The starting point index (inclusive).
 * @param {number} params.indexEnd - The ending point index (inclusive).
 * @param {number} [params.index=0] - The specific index to fetch (defaults to 0).
 * @param {"command" | "pixel" | "slope"} params.page - The API route to fetch from.
 *
 * @returns {Promise<{ tile: T}>} A promise resolving to the requested tile of numeric data.
 *
 * @throws {Error} If the fetch request fails or the server returns a non-OK response.
 */
export async function fetchTile<T extends number[][] | number[][][]>({
    frameStart,
    frameEnd,
    indexStart,
    indexEnd,
    index = 0,
    page
}: {
    frameStart: number
    frameEnd: number
    indexStart: number
    indexEnd: number
    index: number
    page: "command" | "pixel" | "slope"
}): Promise<{ tile: T}> {
    const form = new FormData()
    form.append("frame_start", frameStart.toString())
    form.append("frame_end", frameEnd.toString())
    form.append("index_start", indexStart.toString())
    form.append("index_end", indexEnd.toString())
    form.append("index", index.toString())

    const res = await fetch(`http://localhost:8000/${page}/tile`, {
        method: "POST",
        body: form,
        credentials: "include",
    })

    if (!res.ok) {
        throw new Error(`Title fetch failed: ${res.statusText}`)
    }

    return await res.json()
}
