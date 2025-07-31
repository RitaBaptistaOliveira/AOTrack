import type { ColorMap } from "@/types/visualization"

export const themeColorMap: Record<ColorMap, { point1: [string, string], point2: [string, string], main: string }> = {
    viridis: { point1: ["#6624c1", "#66e83d"], point2: ["#ff8900", "#f1299c"], main: "#0000ff" },
    inferno: { point1: ["#6624c1", "#66e83d"], point2: ["#ff8900", "#f1299c"], main: "#0000ff" },
    greys: { point1: ["#6624c1", "#66e83d"], point2: ["#ff8900", "#f1299c"], main: "#0000ff" },
    blues: { point1: ["#6624c1", "#66e83d"], point2: ["#ff0000", "#ff8080"], main: "#00ff00" },
    reds: { point1: ["#6624c1", "#66e83d"], point2: ["#ff8900", "#f1299c"], main: "#0000ff" },
    rainbow: { point1: ["#6624c1", "#66e83d"], point2: ["#ff8900", "#f1299c"], main: "#0000ff" },
    greens: { point1: ["#6624c1", "#66e83d"], point2: ["#ff8900", "#f1299c"], main: "#0000ff" }
}