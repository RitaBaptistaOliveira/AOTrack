/**
 * Fetches a frame for a specific frame index and a specific WFS or loop depending on the page.
 *
 * This function sends a POST request to the backend to retrieve frame data based on the provided indices.
 * The response is returned as a JSON object containing the requested frame(s).
 *
 * @typeParam T The shape of the returned frame data.
 * @param {Object} params The parameters for the request.
 * @param {number} params.frameIndex The frame index to retrieve.
 * @param {number} params.index The specific index within the frame (e.g., pixel, command, or slope).
 * @param {"command" | "pixel" | "slope"} [params.page] The API route to fetch from.
 *
 * @returns {Promise<T>} The requested frame data.
 *
 * @throws {Error} If the request fails or the response is not OK.
 */
export async function fetchFrame<T extends { frame: number[][] } | { frameX: number[][]; frameY: number[][] }>(
    { frameIndex, index, page }: { frameIndex: number, index: number, page: "command" | "pixel" | "slope" }): Promise<T> {

    const formData = new FormData()
    formData.append("frame_index", frameIndex.toString())
    formData.append("index", index.toString())

    const res = await fetch(`http://localhost:8000/${page}/get-frame`, {
        method: "POST",
        body: formData,
        credentials: "include",
    })

    if (!res.ok) {
        throw new Error(`Title fetch failed: ${res.statusText}`)
    }

    return await res.json()
}
