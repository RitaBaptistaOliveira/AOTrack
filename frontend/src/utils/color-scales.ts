import * as d3 from "d3"
import {
    interpolateViridis,
    interpolateGreys,
    interpolateBlues,
    interpolateReds,
    interpolateGreens,
    interpolateRainbow,
    interpolateInferno
} from "d3-scale-chromatic"
import { getZScaleLimits } from "./interval"
import type { ColorMap, IntervalType, ScaleType } from "@/types/visualization"


function computeInterval(data: number[][], intervalType: string, fallbackMin: number, fallbackMax: number): [number, number] {
    const flat = data.flat().filter(v => Number.isFinite(v))
    if (flat.length === 0) return [fallbackMin, fallbackMax]

    if (intervalType.startsWith("percentile-")) {
        const percentile = parseFloat(intervalType.split("-")[1]) / 100
        const lower_percentile = (1 - percentile) * 0.5
        const upper_percentile = 1 - lower_percentile
        return [
            d3.quantile(flat, lower_percentile) ?? fallbackMin,
            d3.quantile(flat, upper_percentile) ?? fallbackMax
        ]
    } else if (intervalType === "zscale") {
        return getZScaleLimits(flat, fallbackMin, fallbackMax)
    } else {
        return [Math.min(...flat), Math.max(...flat)]
    }
}

function getColorInterpolator(name: ColorMap): (t: number) => string {
    switch (name) {
        case "viridis": return interpolateViridis
        case "greys": return interpolateGreys
        case "blues": return interpolateBlues
        case "reds": return interpolateReds
        case "greens": return interpolateGreens
        case "rainbow": return interpolateRainbow
        case "inferno": return interpolateInferno
        default: return interpolateViridis
    }
}

function getScale(scaleType: ScaleType): (v: number) => number {
    switch (scaleType) {
        case "log":
            return v => {
                if (v === 0)
                    return 0
                return v < 0 ? -Math.log10(1 + Math.abs(v)) : Math.log10(1 + v)
            }
        case "sqrt":
            return Math.sqrt
        case "squared":
            return v => v ** 2
        case "asinh":
            return Math.asinh
        case "sinh":
            return Math.sinh
        case "logexp":
            return v => Math.log(Math.exp(v) + 1)
        case "linear":
        default:
            return v => v
    }
}

export function createColorScale(data: number[][], colormap: ColorMap, scaleType: ScaleType, intervalType: IntervalType, minValue: number, maxValue: number, gradientSteps = 20) {
    //Get: Min and Max from Interval, Function from Scale and Interpolator from Colormap
    const [vMin, vMax] = computeInterval(data, intervalType, minValue, maxValue)
    const interpolator = getColorInterpolator(colormap)
    const scaleFunc = getScale(scaleType)

    //Define transform that allows negative numbers 
    const signedTransform = (v: number) => {
        if (v < 0) return -scaleFunc(-v)
        else if (v > 0) return scaleFunc(v)
        else return 0
    }
    
    //Define Scale
    const tMin = signedTransform(vMin)
    const tMax = signedTransform(vMax)

    const scale = d3.scaleSequential(interpolator)
        .domain([tMin, tMax])
        .clamp(true)
        .unknown("rgba(255, 255, 255, 1)")

    const colorScale = (v: number) => {
        if (!isFinite(v)) return "rgba(255, 255, 255, 1)"
        const transformed = v < 0 ? -signedTransform(Math.abs(v),) : signedTransform(v)
        return scale(transformed)
    }
    
    //Define color stops for legend gradient

    const gradientStops = Array.from({ length: gradientSteps }, (_, i) => {
        const t = i / (gradientSteps - 1)
        const value = d3.interpolateNumber(vMin, vMax)(t)
        return {
            offset: `${t * 100}%`,
            color: colorScale(value),
        }
    })
    return { gradientStops, colorScale }
}