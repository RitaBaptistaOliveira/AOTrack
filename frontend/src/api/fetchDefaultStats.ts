/**
 * Fetches the default statistics (min, max, mean, median, std, variance) for a specific index depending on the page.
 *
 * This function sends a POST request to the backend to retrieve statistical data, such as
 * minimum, maximum, mean, median, standard deviation, and variance, based on the provided index.
 * The response is returned as a JSON object containing the requested statistics.
 *
 * @typeParam T The type of the statistic values (e.g., number or [number, number]).
 * @param {Object} params The parameters for the request.
 * @param {number} params.index The index for which the statistics are being fetched.
 * @param {"command" | "pixel" | "slope"} params.page The page type that determines which endpoint is used.
 * 
 * @returns {Promise<Object>} A promise that resolves to an object containing the default statistics:
 *   - min
 *   - max
 *   - mean
 *   - median
 *   - std
 *   - variance
 * 
 * @throws {Error} If the fetch request fails or the response status is not OK, an error is thrown.
 */
export async function fetchDefaultStats<T extends number | [number, number]>(
  { index, page }: { index: number, page: "command" | "pixel" | "slope" }):
  Promise<{
    min: T
    max: T
    mean: T
    median: T
    std: T
    variance: T
  }> {

  const formData = new FormData()
  formData.append("index", index.toString())

  const res = await fetch(`http://localhost:8000/${page}/get-default-stats`, {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Default charts fetch failed: ${res.statusText}`)
  }

  return await res.json()
}
