import { useCallback, useEffect, useState } from "react"
import { fetchDefaultStats } from "@/api/fetchDefaultStats"
import { fetchPointStats } from "@/api/fetchPointStats"
import { fetchFrame } from "@/api/fetchFrame"
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
    point_vals: DataPoint[]
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
                const result = await fetchDefaultStats<number>({index: wfsIndex, page: "pixel"})

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
    }, [wfsIndex])

    const fetchPointData = useCallback(
        async (col: number, row: number) => {
            try {
                const res = await fetchPointStats<DataPoint[], number>({
                    index: wfsIndex,
                    point_col: col,
                    point_row: row,
                    page: "pixel"
                })
                setPointData(res)
            } catch (err) {
                console.error("Failed to fetch point data:", err)
                setPointData(undefined)
            }
        },
        [wfsIndex]
    )

    const fetchSingleFrameImmediate = useCallback(async (frameIndex: number) => {
        try {
            const json = await fetchFrame<{ frame: number[][] }>({ frameIndex, index: wfsIndex, page: "pixel" })
            setBuffer(prev => {
                const newBuffer = new Map(prev)
                newBuffer.set(frameIndex, json.frame)
                return newBuffer
            })
            return json.frame
        } catch (err) {
            console.error(`Failed to fetch frame ${frameIndex}:`, err)
            return null
        }
    }, [fetchFrame])


    const fetchMultipleFrames = useCallback(async (frameIndices: number[], min: number, max: number) => {
        const results = await Promise.allSettled(
            frameIndices.map(i => fetchFrame<{ frame: number[][] }>({ frameIndex: i, index: wfsIndex, page: "pixel" }))
        )

        setBuffer(prev => {
            const newBuffer = new Map(prev)

            results.forEach((res, idx) => {
                if (res.status === "fulfilled") {
                    newBuffer.set(frameIndices[idx], res.value.frame);
                }
            })

            for (const key of newBuffer.keys()) {
                if (key < min || key > max) newBuffer.delete(key)
            }
            return newBuffer
        })
    }, [fetchFrame])

    const preloadAround = async (center: number, radius = 5) => {
        const min = Math.max(0, center - radius)
        const max = Math.min(
            center + radius,
            meta && typeof meta.numFrames === "number" ? meta.numFrames - 1 : 1
        )

        if (!buffer.has(center)) {
            await fetchSingleFrameImmediate(center)
        }


        const neighbors = []
        for (let frameIndex = min; frameIndex <= max; frameIndex++) {
            if (!buffer.has(frameIndex) && frameIndex !== center) {
                neighbors.push(frameIndex)
            }
        }

        if (neighbors.length > 0) {
            fetchMultipleFrames(neighbors, min, max)
        }
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
