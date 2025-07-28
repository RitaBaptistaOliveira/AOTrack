import * as d3 from "d3-array"

const N_SAMPLES = 1000
const CONTRAST = 0.25
const MAX_REJECT = 0.5
const MIN_N_PIXELS = 5
const K_REJ = 2.5
const MAX_ITERATIONS = 5

export function getZScaleLimits(values: number[], fallbackMin: number, fallbackMax: number): [number, number] {

    if (!values || values.length === 0) return [fallbackMin, fallbackMax]

    const stride = Math.max(1, Math.floor(values.length / N_SAMPLES))

    const samples = d3.range(0, values.length, stride)
        .slice(0, N_SAMPLES)
        .map(i => values[i])
        .sort((a, b) => a - b)

    const nPix = samples.length
    let vMin = samples[0]
    let vMax = samples[nPix - 1]

    const minPix = Math.max(MIN_N_PIXELS, Math.floor(nPix * MAX_REJECT))
    const x = d3.range(nPix)
    let badPix = new Array(nPix).fill(false)
    const nGrow = Math.max(1, Math.floor(nPix * 0.01))
    const kernel = new Array(nGrow).fill(true)

    let nGoodPix = nPix
    let lastNGoodPix = nPix + 1

    let fit = [0, 0]

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        if (nGoodPix >= lastNGoodPix || nGoodPix < minPix) break

        const goodX: number[] = []
        const goodY: number[] = []
        for (let i = 0; i < nPix; i++) {
            if (!badPix[i]) {
                goodX.push(x[i])
                goodY.push(samples[i])
            }
        }

        if (goodX.length < 2) break

        fit = linearFit(goodX, goodY)
        const [slope, intercept] = fit

        const fitted = x.map(xi => slope * xi + intercept)
        const residuals = samples.map((s, i) => s - fitted[i])
        const goodResiduals = residuals.filter((_, i) => !badPix[i])
        const std = d3.deviation(goodResiduals) || 0
        const threshold = K_REJ * std

        // Reject outliers
        for (let i = 0; i < nPix; i++) {
            if (residuals[i] < -threshold || residuals[i] > threshold) {
                badPix[i] = true
            }
        }

        // Grow the bad pixel mask
        badPix = convolveBadPix(badPix, kernel)

        lastNGoodPix = nGoodPix
        nGoodPix = badPix.filter(b => !b).length
    }

    if (nGoodPix >= minPix) {
        let [slope] = fit
        if (CONTRAST > 0) slope = slope / CONTRAST

        const centerPixel = Math.floor((nPix - 1) / 2)
        const median = d3.median(samples) ?? 0
        vMin = Math.max(vMin, median - (centerPixel - 1) * slope)
        vMax = Math.min(vMax, median + (nPix - centerPixel) * slope)
    }

    return [vMin, vMax]
}

function linearFit(x: number[], y: number[]): [number, number] {
    const n = x.length
    const meanX = d3.mean(x) ?? 0
    const meanY = d3.mean(y) ?? 0

    let num = 0
    let den = 0
    for (let i = 0; i < n; i++) {
        num += (x[i] - meanX) * (y[i] - meanY)
        den += (x[i] - meanX) ** 2
    }

    const slope = den !== 0 ? num / den : 0
    const intercept = meanY - slope * meanX
    return [slope, intercept]
}

function convolveBadPix(badPix: boolean[], kernel: boolean[]): boolean[] {
    const n = badPix.length
    const k = kernel.length
    const pad = Math.floor(k / 2)
    const result = new Array(n).fill(false)

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < k; j++) {
            const idx = i + j - pad
            if (idx >= 0 && idx < n && badPix[idx] && kernel[j]) {
                result[i] = true
                break
            }
        }
    }
    return result
}
