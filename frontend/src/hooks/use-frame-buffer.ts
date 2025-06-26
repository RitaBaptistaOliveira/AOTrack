import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useCallback, useEffect, useRef, useState } from "react"
import { fetchDefaultPixelCharts } from "@/api/pixel/fetchDefaultCharts"
import { fetchHistogram } from "@/api/pixel/fetchHistogram"
import { fetchPointStats } from "@/api/pixel/fetchPointStats"
import type { DataPoint } from "@/types/visualization"

type FrameMeta = {
    numFrames: number
    numCols: number
    numRows: number
    overallMin: number
    overallMax: number
}

type DefaultCharts = {
    frameMeans: DataPoint[]
    stats: {
        min: number
        max: number
        mean: number
        median: number
        std: number
        variance: number
    }
}

type PointStats = {
    point_means: DataPoint[]
    stats: {
        min: number
        max: number
        mean: number
        median: number
        std: number
        variance: number
    }
}

export function useFrameBuffer(wfsIndex: number) {
    const { intervalType, scaleType } = useChartInteraction()
    const [isLoading, setLoading] = useState(false)
    const buffer = useRef(new Map<number, number[][]>())
    const [meta, setMeta] = useState<FrameMeta | undefined>()
    const [charts, setCharts] = useState<DefaultCharts | undefined>()
    const [numBins, setNumBins] = useState(30)

    const [globalHistogramData, setGlobalHistogramData] = useState<{ counts: number[]; bins: number[] } | undefined>()
    const [histogramData, setHistogramData] = useState<{ counts: number[]; bins: number[] } | undefined>()
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

        const res = await fetch("http://localhost:8000/pixel/get-frame", {
            method: "POST",
            body: form,
            credentials: "include",
        })

        const json = await res.json()
        buffer.current.set(frameIndex, json.frame)
    }

    const preloadAround = (center: number, radius = 5) => {
        const min = Math.max(0, center - radius)
        const max = center + radius
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

    // Call fetchMeta once
    useEffect(() => {
        const fetchMeta = async () => {
            const form = new FormData()
            form.append("wfs_index", wfsIndex.toString())

            const res = await fetch("http://localhost:8000/pixel/get-meta", {
                method: "POST",
                body: form,
                credentials: "include",
            })

            const data = await res.json()
            setMeta(
                {
                    numFrames: data.num_frames,
                    numCols: data.num_cols,
                    numRows: data.num_rows,
                    overallMin: data.overall_min,
                    overallMax: data.overall_max
                }
            )
        }
        fetchMeta()
    }, [wfsIndex])

    const fetchGlobalHistogramData = useCallback(async () => {
        setHistogramLoading(true)
        setHistogramError(null)
        try {
            const res = await fetchHistogram({
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
        async (options?: { col?: number; row?: number }) => {
            setHistogramLoading(true)
            setHistogramError(null)
            try {
                const res = await fetchHistogram({
                    wfsIndex,
                    numBins,
                    col: options?.col,
                    row: options?.row,
                })
                console.log(res)
                setHistogramData({
                    counts: res.counts1,
                    bins: res.bins1
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
                const result = await fetchDefaultPixelCharts({
                    wfsIndex
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
                console.error("Failed to fetch default pixel charts:", err)
            }
        }

        fetchCharts()
        fetchGlobalHistogramData()
    }, [wfsIndex, intervalType, scaleType])

    const fetchPointStatsData = useCallback(
        async (col: number, row: number) => {
            setPointStatsLoading(true)
            setPointStatsError(null)
            try {
                const res = await fetchPointStats({
                    wfsIndex,
                    col,
                    row
                })
                setPointStatsData(res)
            } catch (err) {
                setPointStatsError(err as Error)
            } finally {
                setPointStatsLoading(false)
            }
        },
        [wfsIndex, numBins]
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
