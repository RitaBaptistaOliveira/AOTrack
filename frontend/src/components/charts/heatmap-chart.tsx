import CanvasChart from "./canvas-chart"
import ControlBar from "../controls/control-bar"
import DropdownGroup from "../controls/dropdown-group"
import FrameSlider from "../controls/frame-slider"
import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useAoHelper } from "@/hooks/use-ao-helper"

type DrawArgs = {
    canvas: HTMLCanvasElement,
}

type Data = {
    label: string
}

interface HeatmapChartProps {
    frames: number[][][],
    numRows: number,
    numCols: number,
    numFrames: number
}

export default function HeatmapChart({ frames, numRows, numCols, numFrames }: HeatmapChartProps) {

    const { currentFrame, selectedPoint, interpolator } = useChartInteraction()

    const { fetchFrameChanges } = useAoHelper()

    async function draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
        const frameData = frames[currentFrame]
        if (!frameData) {
            console.error("No data for current frame:", currentFrame)
            return
        }

        const cellSize = Math.min(canvas.width / numCols, canvas.height / numRows)

        const newFrameData = await fetchFrameChanges(frameData)

        // Draw cells
        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                const value = newFrameData[i][j]
                ctx.fillStyle = interpolator(value)
                ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize)
            }
        }
    }


    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 p-0 flex flex-col">
                <CanvasChart
                    draw={draw}
                    mapCanvasToData={mapCanvasToData}
                    getHoveredDataAt={getHoveredDataAt}
                    drawSelected={drawSelected}
                    formatTooltip={formatTooltip}
                />
                <div className="pt-2">
                    <FrameSlider totalFrames={numFrames}/>
                </div>
            </div>
        </div>
    )
}


// When clicking, just return some dummy data if inside the square
function mapCanvasToData(pt: { x: number, y: number }): Data | null {
    if (pt.x >= 50 && pt.x <= 50 + 100 && pt.y >= 50 && pt.y <= 50 + 100) {
        return { label: "Square clicked!" }
    }
    return null
}

// Same for hover
function getHoveredDataAt(pt: { x: number, y: number }): Data | null {
    if (pt.x >= 50 && pt.x <= 50 + 100 && pt.y >= 50 && pt.y <= 50 + 100) {
        return { label: "Square hover!" }
    }
    return null
}

// Draw selected: draw a red border around the square
function drawSelected(ctx: CanvasRenderingContext2D, data: Data) {
    ctx.strokeStyle = "red"
    ctx.lineWidth = 3
    ctx.strokeRect(50, 50, 100, 100)
}

// Format tooltip text
function formatTooltip(data: Data | null): string {
    return data ? data.label : ""
}
