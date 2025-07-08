import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useCallback, useEffect, useState } from "react"
import { fetchDefaultStats } from "@/api/pixel/fetchDefaultStats"
import { fetchPointStats } from "@/api/pixel/fetchPointStats"
import { fetchFrame } from "@/api/pixel/fetchFrame"
import type { DataPoint } from "@/types/visualization"

type FrameMeta = {
    numFrames: number
    numCols: number
    numRows: number
    overallMin: number
    overallMax: number
}

type DefaultStats = {
    min: number
    max: number
    mean: number
    median: number
    std: number
    variance: number
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
    // const buffer = useRef(new Map<number, number[][]>())
    const [meta, setMeta] = useState<FrameMeta | undefined>()
    const [stats, setStats] = useState<DefaultStats | undefined>()
    const [buffer, setBuffer] = useState<Map<number, number[][]>>(new Map())
    const [pointData, setPointData] = useState<PointStats | undefined>()

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

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const result = await fetchDefaultStats({
                    wfsIndex
                })

                setStats({
                    min: result.min,
                    max: result.max,
                    mean: result.mean,
                    median: result.median,
                    std: result.std,
                    variance: result.variance,
                })
            } catch (err) {
                console.error("Failed to fetch default pixel charts:", err)
            }
        }
        fetchStats()
    }, [wfsIndex, intervalType, scaleType])

    const fetchPointData = useCallback(
        async (col: number, row: number) => {
            try {
                const res = await fetchPointStats({
                    wfsIndex,
                    col,
                    row,
                    intervalType,
                    scaleType
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
                    const json = await fetchFrame({ frameIndex, wfsIndex, scaleType, intervalType })

                    newBuffer.set(frameIndex, json.frame)
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
