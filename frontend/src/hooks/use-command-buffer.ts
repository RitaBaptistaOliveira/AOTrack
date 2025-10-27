import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useCallback, useEffect, useState } from "react"
import { fetchDefaultStats } from "@/api/fetchDefaultStats"
import { fetchPointStats } from "@/api/fetchPointStats"
import { fetchFrame } from "@/api/fetchFrame"
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
    point_vals: DataPoint[]
    stats: {
        min: number
        max: number
        mean: number
        median: number
        std: number
        variance: number
    }
    contributions: DataPoint[]
}

type ActuatorStats = {
    point_vals: DataPoint[]
    stats: {
        min: number
        max: number
        mean: number
        median: number
        std: number
        variance: number
    }
    contributions: number[][]
}


export function useCommandBuffer(loopIndex: number) {
    const { intervalType, scaleType } = useChartInteraction()
    const [meta, setMeta] = useState<FrameMeta | undefined>()
    const [stats, setStats] = useState<DefaultStats | undefined>()
    const [buffer, setBuffer] = useState<Map<number, number[][]>>(new Map())
    const [pupilData, setPupilData] = useState<PointStats | undefined>()
    const [actuatorData, setActuatorData] = useState<ActuatorStats | undefined>()

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
                const result = await fetchDefaultStats<number>({ index: loopIndex, page: "command" })
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
        async (col: number, row: number, frame: number) => {
            try {
                const res = await fetchPointStats<DataPoint[], number>({
                    index: loopIndex,
                    point_col: col,
                    point_row: row,
                    page: "command"
                })

                const contribs = await fetchPointStats<DataPoint[], number>({
                    index: loopIndex,
                    point_col: col,
                    point_row: row,
                    frameIndex: frame,
                    page: "command"
                })
                setPupilData({ point_vals: res.point_vals, stats: res.stats!, contributions: contribs.point_vals })
            } catch (err) {
                console.error("Failed to fetch point data:", err)
                setPupilData(undefined)
            }
        },
        [loopIndex]
    )

    const fetchPointContributions = useCallback(
        async (col: number, row: number, frame: number) => {
            try {
                const res = await fetchPointStats<DataPoint[], number>({
                    index: loopIndex,
                    point_col: col,
                    point_row: row,
                    frameIndex: frame,
                    page: "command"
                })
                setPupilData({ ...pupilData!, contributions: res.point_vals })
            } catch (err) {
                console.error("Failed to fetch point data:", err)
                setPupilData(undefined)
            }
        },
        [loopIndex]
    )

    const fetchActuatorData = useCallback(
        async (actuatorIndex: number, frame: number) => {
            try {
                const res = await fetchPointStats<DataPoint[], number>({
                    index: loopIndex,
                    point_index: actuatorIndex,
                    page: "command"
                })

                const contribs = await fetchPointStats<number[][], number>({
                    index: loopIndex,
                    point_index: actuatorIndex,
                    frameIndex: frame,
                    page: "command"
                })
                setActuatorData({ point_vals: res.point_vals, stats: res.stats!, contributions: contribs.point_vals })

            } catch (err) {
                console.error("Failed to fetch actuator data:", err)
                setActuatorData(undefined)
            }
        },
        [loopIndex]
    )

    const fetchActuatorContributions = useCallback(
        async (actuatorIndex: number, frame: number) => {
            try {
                const res = await fetchPointStats<number[][], number>({
                    index: loopIndex,
                    point_index: actuatorIndex,
                    frameIndex: frame,
                    page: "command"
                })
                setActuatorData({ ...actuatorData!, contributions: res.point_vals })
            } catch (err) {
                console.error("Failed to fetch actuator data:", err)
                setActuatorData(undefined)
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
                    const json = await fetchFrame<{ frame: number[][] }>({ frameIndex, index: loopIndex, page: "command" })

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
        pupilData,
        setPupilData,
        fetchPointData,
        fetchPointContributions,
        actuatorData,
        setActuatorData,
        fetchActuatorData,
        fetchActuatorContributions

    }
}
