export function generateColorGradient(min = 0, max = 1, steps = 20, interpolator: (value: number) => string) {
    return Array.from({ length: steps }, (_, i) => {
        const value = min + ((max - min) * i) / (steps - 1)
        const offset = `${(i / (steps - 1)) * 100}%`
        const color = interpolator(value)
        return { offset, color }
    })
}