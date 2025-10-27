import { useMemo, useState } from "react"
import { createColorScale } from "@/utils/color-scales"
import type { ColorMap, IntervalType, ScaleType } from "@/types/visualization";

export function useColorScale(
    data: number[][][],
    colorMap: ColorMap,
    scaleType: ScaleType,
    intervalType: IntervalType,
    minValue: number,
    maxValue: number
) {
    const [gradientStops, setGradientStops] = useState<{ offset: string; color: string }[]>([])

    const colorScale = useMemo(() => {
        const { gradientStops, colorScale } = createColorScale(
            data.flat(),
            colorMap,
            scaleType,
            intervalType,
            minValue,
            maxValue
        )
        setGradientStops(gradientStops)
        return colorScale
    }, [data, colorMap, scaleType, intervalType, minValue, maxValue])

    return { colorScale, gradientStops }
}
