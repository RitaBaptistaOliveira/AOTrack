export function getPointFromCoordinates(
    x: number,
    y: number,
    numFrames: number,
    numIndexes: number,
    offsetRef: { current: { x: number; y: number } },
    zoomRef: { current: number },
    cellSize: number) {


    const zoomLevel = zoomRef.current
    const offset = offsetRef.current

    const dataX = (x - offset.x) / zoomLevel
    const dataY = (y - offset.y) / zoomLevel

    const frame = Math.floor(dataX / cellSize)
    const index = Math.floor(dataY / cellSize)

    if (frame >= 0 && frame < numFrames && index >= 0 && index < numIndexes) return { frame, index }
    return null
}