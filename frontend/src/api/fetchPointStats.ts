import type { DataPoint } from "@/types/visualization"

/**
 * Represents a statistical summary of a dataset.
 *
 * This type is generic and can hold either simple numeric statistics
 * (e.g., `number`) or more complex forms (e.g., `[number, number]` for paired stats).
 *
 * @template T The type of the statistic values (e.g., `number` or `[number, number]`).
 */
type StatSummary<T> = {
  /** The minimum value in the dataset. */
  min: T
  /** The maximum value in the dataset. */
  max: T
  /** The arithmetic mean (average) of the dataset. */
  mean: T
  /** The median (middle value) of the dataset. */
  median: T
  /** The standard deviation of the dataset. */
  std: T
  /** The variance of the dataset. */
  variance: T
}

/**
 * Fetches point statistics for a given index and page (command, pixel, slope).
 *
 * - command/slope: requires `point_index`
 * - pixel: requires `point_col` and `point_row`
 *
 * @typeParam V The type of the point values (e.g., `DataPoint[]` or `[DataPoint[], DataPoint[]]`).
 * @typeParam S The type of the statistics (e.g., `number` or `[number, number]`).
 *
 * @param {Object} params The parameters for the request.
 * @param {number} params.index The index to retrieve.
 * @param {number} [params.point_index] The point index (required for command/slope).
 * @param {number} [params.point_col] The point column (required for pixel).
 * @param {number} [params.point_row] The point row (required for pixel).
 * @param {"command" | "pixel" | "slope"} params.page The API route to fetch from.
 *
 * @returns {Promise<{ point_vals: V; stats: StatSummary<S> }>} The requested point statistics.
 */
export async function fetchPointStats<
  V extends DataPoint[] | [DataPoint[], DataPoint[]],
  S extends number | [number, number]
>({ index, point_index, point_col, point_row, page }: { index: number, point_index?: number, point_col?: number, point_row?: number, page: "command" | "pixel" | "slope" }):
  Promise<{ point_vals: V; stats: StatSummary<S> }> {
  const formData = new FormData()
  formData.append("index", index.toString())

  if (page === "command" || page === "slope") {
    if (point_index === undefined) throw new Error("point_index is required for command/slope")
    formData.append("point_index", point_index.toString())
  } else if (page === "pixel") {
    if (point_col === undefined || point_row === undefined) throw new Error("point_col and point_row are required for pixel")
    formData.append("point_col", point_col.toString())
    formData.append("point_row", point_row.toString())
  }

  console.log("formData:", Object.fromEntries(formData.entries()))

  const res = await fetch(`http://localhost:8000/${page}/get-point-stats`, {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`Point stats fetch failed: ${res.statusText}`)
  }
  
  return await res.json()
}
