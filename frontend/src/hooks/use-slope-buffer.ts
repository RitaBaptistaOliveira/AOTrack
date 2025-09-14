import { useCallback, useEffect, useState } from "react"
import { fetchDefaultStats } from "@/api/fetchDefaultStats"
import { fetchPointStats } from "@/api/fetchPointStats"
import { fetchFrame } from "@/api/fetchFrame"
import type { DataPoint } from "@/types/visualization"

type FrameMeta = {
  numFrames: number
  numIndices: number
  dim: number
  overallMin: number
  overallMax: number
  numRows?: number
  numCols?: number
  subapertureMask?: number[][]
  unit?: string
}

type DefaultStats = {
  min: [number, number]
  max: [number, number]
  mean: [number, number]
  median: [number, number]
  std: [number, number]
  variance: [number, number]
}

type PointStats = {
  point_vals: [DataPoint[], DataPoint[]]
  stats: {
    min: [number, number]
    max: [number, number]
    mean: [number, number]
    median: [number, number]
    std: [number, number]
    variance: [number, number]
  }
}

export function useSlopeFrameBuffer(wfsIndex: number) {
  const [buffer, setBuffer] = useState<Map<number, { x: number[][]; y: number[][] }>>(new Map())
  const [meta, setMeta] = useState<FrameMeta | undefined>()
  const [stats, setStats] = useState<DefaultStats | undefined>()
  const [pointData, setPointData] = useState<PointStats | undefined>()

  useEffect(() => {
    const fetchMeta = async () => {
      const form = new FormData()
      form.append("wfs_index", wfsIndex.toString())

      const res = await fetch("http://localhost:8000/slope/get-meta", {
        method: "POST",
        body: form,
        credentials: "include",
      })

      const data = await res.json()
      setMeta({
        numFrames: data.num_frames,
        numIndices: data.num_indices,
        dim: data.dim,
        overallMin: data.overall_min,
        overallMax: data.overall_max,
        numCols: data.num_cols ?? undefined,
        numRows: data.num_rows ?? undefined,
        subapertureMask: data.subaperture_mask ?? undefined,
        unit: data.unit ?? undefined
      })
    }
    fetchMeta()
  }, [wfsIndex])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await fetchDefaultStats<[number, number]>({ index: wfsIndex, page: "slope" })
        setStats({
          min: result.min,
          max: result.max,
          mean: result.mean,
          median: result.median,
          std: result.std,
          variance: result.variance
        })
      } catch (err) {
        console.error("Failed to fetch default slope charts:", err)
      }
    }

    fetchStats()
  }, [wfsIndex])

  const fetchPointData = useCallback(
    async (index: number) => {
      try {
        const res = await fetchPointStats<[DataPoint[], DataPoint[]], [number, number]>({
          index: wfsIndex,
          point_index: index,
          page: "slope"
        })
        setPointData(res)
      } catch (err) {
        console.error("Failed to fetch point data:", err)
        setPointData(undefined)
      }
    },
    [wfsIndex]
  )

  const preloadAround = async (center: number, radius = 5) => {
    const min = Math.max(0, center - radius)
    const max = Math.min(
      center + radius,
      meta && typeof meta.numFrames === "number" ? meta.numFrames - 1 : 1
    )

    const newBuffer = new Map(buffer)

    for (let frameIndex = min; frameIndex <= max; frameIndex++) {

      if (!buffer.has(frameIndex)) {
        try {
          const json = await fetchFrame<{ frameX: number[][]; frameY: number[][] }>({ frameIndex, index: wfsIndex, page: "slope" })

          newBuffer.set(frameIndex, { x: json.frameX, y: json.frameY })
        } catch (err) {
          console.error(`Failed to fetch frame ${frameIndex}:`, err)
        }
      }
    }

    for (const key of newBuffer.keys()) {
      if (key < min || key > max) newBuffer.delete(key)
    }

    setBuffer(newBuffer)
  }

  return {
    getFrame: (i: number) => buffer.get(i),
    hasFrame: (i: number) => buffer.has(i),
    preloadAround,
    meta,
    stats,
    pointData,
    fetchPointData,
    setPointData
  }
}
