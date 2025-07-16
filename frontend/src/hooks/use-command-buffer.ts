import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useCallback, useEffect, useState } from "react"
import { fetchDefaultStats } from "@/api/command/fetchDefaultStats"
import { fetchPointStats } from "@/api/command/fetchPointStats"
import { fetchFrame } from "@/api/command/fetchFrame"
import type { DataPoint } from "@/types/visualization"

type FrameMeta = {
    numFrames: number
    numIndices: number
    overallMin: number
    overallMax: number
    numRows?: number
    numCols?: number
    colRowToIndex?: number[][]
    indexToColRow?: [number, number][]
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

export function useCommandBuffer(loopIndex: number) {
    const { intervalType, scaleType } = useChartInteraction()
    const [meta, setMeta] = useState<FrameMeta | undefined>()
    const [stats, setStats] = useState<DefaultStats | undefined>()
    const [buffer, setBuffer] = useState<Map<number, number[][]>>(new Map())
    const [pointData, setPointData] = useState<PointStats | undefined>()

    // Call fetchMeta once
    useEffect(() => {
        const fetchMeta = async () => {
            const form = new FormData()
            form.append("loop_index", loopIndex.toString())

            const res = await fetch("http://localhost:8000/command/get-meta", {
                method: "POST",
                body: form,
                credentials: "include",
            })

            const data = await res.json()
            console.log("Meta data fetched:", data)
            setMeta(
                {
                    numFrames: data.num_frames,
                    numIndices: data.num_indices,
                    overallMin: data.overall_min,
                    overallMax: data.overall_max,
                    numCols: data.num_cols ?? undefined,
                    numRows: data.num_rows ?? undefined,
                    colRowToIndex: data.lookup?.col_row_to_index ?? undefined,
                    indexToColRow: data.lookup?.index_to_col_row ?? undefined
                }
            )
        }
        fetchMeta()
    }, [loopIndex])

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const result = await fetchDefaultStats({
                    loopIndex
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
                console.error("Failed to fetch default command charts:", err)
            }
        }
        fetchStats()
    }, [loopIndex, intervalType, scaleType])

    const fetchPointData = useCallback(
        async (index: number) => {
            try {
                const res = await fetchPointStats({
                    loopIndex,
                    index,
                    intervalType,
                    scaleType
                })
                setPointData(res)
            } catch (err) {
                console.error("Failed to fetch point data:", err)
                setPointData(undefined)
            }
        },
        [loopIndex]
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
                    const json = await fetchFrame({ frameIndex, loopIndex, scaleType, intervalType })

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
