/**
 * Fetches the default statistics (min, max, mean, median, std, variance) for a specific loop index.
 *
 * This function sends a POST request to the backend to retrieve statistical data, such as
 * minimum, maximum, mean, median, standard deviation, and variance, based on the provided
 * loop index. The response is returned as a JSON object containing the requested statistics.
 *
 * @param {Object} params - The parameters for the request.
 * @param {number} params.loopIndex - The loop index for which the statistics are being fetched.
 * 
 * @returns {Promise<Object>} A promise that resolves to an object containing the default statistics:
 *   - min: The minimum value.
 *   - max: The maximum value.
 *   - mean: The mean value.
 *   - median: The median value.
 *   - std: The standard deviation.
 *   - variance: The variance.
 * 
 * @throws {Error} If the fetch request fails or the response status is not OK, an error is thrown.
 */
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
