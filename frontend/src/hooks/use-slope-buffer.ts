import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useCallback, useEffect, useRef, useState } from "react"
import { fetchDefaultSlopeCharts } from "@/api/slope/fetchDefaultCharts"
import { fetchSlopeHistogram } from "@/api/slope/fetchHistogram"
import { fetchSlopePointStats } from "@/api/slope/fetchPointStats"
import type { DataPoint } from "@/types/visualization"

type FrameMeta = {
  numFrames: number
  numIndices: number
  overallMin: number
  overallMax: number
  numRows?: number
  numCols?: number
}

type DefaultCharts = {
  frameMeans: [DataPoint[], DataPoint[]],
  stats: {
    min: [number, number]
    max: [number, number]
    mean: [number, number]
    median: [number, number]
    std: [number, number]
    variance: [number, number]
  }
}

type PointStats = {
  point_means: [DataPoint[], DataPoint[]]
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
  const { intervalType, scaleType } = useChartInteraction()
  const [isLoading, setLoading] = useState(false)
  const buffer = useRef(new Map<number, { x: number[][]; y: number[][] }>())
  const [meta, setMeta] = useState<FrameMeta | undefined>()
  const [charts, setCharts] = useState<DefaultCharts | undefined>()
  const [numBins, setNumBins] = useState(30)

  const [globalHistogramData, setGlobalHistogramData] = useState<any | undefined>()

  const [histogramData, setHistogramData] = useState<any | undefined>()

  const [histogramLoading, setHistogramLoading] = useState(false)
  const [histogramError, setHistogramError] = useState<Error | null>(null)

  const [pointStatsData, setPointStatsData] = useState<PointStats | undefined>()
  const [pointStatsLoading, setPointStatsLoading] = useState(false)
  const [pointStatsError, setPointStatsError] = useState<Error | null>(null)

  const fetchFrame = async (frameIndex: number) => {
    const form = new FormData()
    form.append("frame_index", frameIndex.toString())
    form.append("wfs_index", wfsIndex.toString())
    form.append("interval_type", intervalType)
    form.append("scale_type", scaleType)

    const res = await fetch("http://localhost:8000/slope/get-frame", {
      method: "POST",
      body: form,
      credentials: "include",
    })

    if (!res.ok) {
      throw new Error(`Slope frame fetch failed: ${res.statusText}`)
    }

    const json = await res.json()
    buffer.current.set(frameIndex, {
      x: json.x_frame,
      y: json.y_frame,
    })
  }

  const preloadAround = (center: number, radius = 5, numFrames: number) => {
    const min = Math.max(0, center - radius)
    const max =  Math.min(center + radius, numFrames - 1)
    setLoading(true)

    const toFetch = []
    for (let i = min; i <= max; i++) {
      if (!buffer.current.has(i)) {
        toFetch.push(fetchFrame(i))
      }
    }

    Promise.all(toFetch).then(() => {
      for (const key of buffer.current.keys()) {
        if (key < min || key > max) buffer.current.delete(key)
      }
      setLoading(false)
    })
  }

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
        overallMin: data.overall_min,
        overallMax: data.overall_max,
        numCols: data.num_cols ?? undefined,
        numRows: data.num_rows ?? undefined,
      })
    }
    fetchMeta()
  }, [wfsIndex])

  const fetchGlobalHistogramData = useCallback(async () => {
    setHistogramLoading(true)
    setHistogramError(null)
    try {
      const res = await fetchSlopeHistogram({
        wfsIndex,
        numBins
      })
      setGlobalHistogramData(res)
    } catch (err) {
      setHistogramError(err as Error)
    } finally {
      setHistogramLoading(false)
    }
  }, [wfsIndex, numBins])

  const fetchHistogramData = useCallback(
    async (index: number) => {
      setHistogramLoading(true)
      setHistogramError(null)
      try {
        const res = await fetchSlopeHistogram({
          wfsIndex,
          numBins,
          index
        })
        console.log(res)
        setHistogramData({
          counts: res.counts_point,
          bins: res.bins_point,
        })
      } catch (err) {
        setHistogramError(err as Error)
      } finally {
        setHistogramLoading(false)
      }
    },
    [wfsIndex, numBins]
  )

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        const result = await fetchDefaultSlopeCharts({
          wfsIndex,
        })

        setCharts({
          frameMeans: result.frame_means,
          stats: {
            min: result.min,
            max: result.max,
            mean: result.mean,
            median: result.median,
            std: result.std,
            variance: result.variance,
          },
        })
      } catch (err) {
        console.error("Failed to fetch default slope charts:", err)
      }
    }

    fetchCharts()
    fetchGlobalHistogramData()
  }, [wfsIndex])

  const fetchPointStatsData = useCallback(
    async (index: number) => {
      setPointStatsLoading(true)
      setPointStatsError(null)
      try {
        const res = await fetchSlopePointStats({
          wfsIndex,
          index
        })
        setPointStatsData(res)
      } catch (err) {
        setPointStatsError(err as Error)
      } finally {
        setPointStatsLoading(false)
      }
    },
    [wfsIndex]
  )

  return {
    getFrame: (i: number) => buffer.current.get(i),
    hasFrame: (i: number) => buffer.current.has(i),
    isLoading,
    preloadAround,
    meta,
    charts,
    numBins,
    setNumBins,
    globalHistogramData,
    histogramData,
    histogramLoading,
    histogramError,
    fetchHistogramData,
    fetchGlobalHistogramData,
    pointStatsData,
    pointStatsLoading,
    pointStatsError,
    fetchPointStatsData,
  }
}
