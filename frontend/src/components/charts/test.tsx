import CanvasChart from "./canvas-chart"

type DrawArgs = {
    squareSize: number
}

type Data = {
    label: string
}

// Simple draw function that draws a square
function draw(ctx: CanvasRenderingContext2D, drawArgs: DrawArgs) {
    ctx.fillStyle = "lightblue"
    ctx.fillRect(50, 50, drawArgs.squareSize, drawArgs.squareSize)
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

export default function TestCanvasChart() {
    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 p-0 flex flex-col">
                <CanvasChart
                    draw={draw}
                    drawArgs={{ squareSize: 100 }}
                    mapCanvasToData={mapCanvasToData}
                    getHoveredDataAt={getHoveredDataAt}
                    drawSelected={drawSelected}
                    formatTooltip={formatTooltip}
                />
            </div>
        </div>
    )
}
