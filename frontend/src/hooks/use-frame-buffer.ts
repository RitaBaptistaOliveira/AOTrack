import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useEffect, useRef, useState } from "react"

type FrameBuffer = {
    getFrame: (i: number) => number[][] | undefined
    hasFrame: (i: number) => boolean
    isLoading: boolean
    preloadAround: (i: number, radius?: number) => void
}

type FrameMeta = {
    numFrames: number
    numCols: number
    numRows: number
    overallMin: number
    overallMax: number
}

export function useFrameBuffer(wfsIndex: number): FrameBuffer & { meta?: FrameMeta } {
    const { intervalType, scaleType } = useChartInteraction()
    const [isLoading, setLoading] = useState(false)
    const buffer = useRef(new Map<number, number[][]>())
    const [meta, setMeta] = useState<FrameMeta | undefined>()

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
            // Delete frames outside the buffer
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
            console.log(data)
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

    return {
        getFrame: (i) => buffer.current.get(i),
        hasFrame: (i) => buffer.current.has(i),
        isLoading,
        preloadAround,
        meta,
    }
}
