import { type RefObject } from "react"

interface TimelineViewCanvasProps {
    dim: number,
    canvasRefs: RefObject<(HTMLCanvasElement | null)[]>,
    handleMouseDown: any,
    handleMouseMove: any,
    handleMouseUp: any,
    handleMouseLeave: any,
    handleMouseWheel: any,
    handleKeyDown: any,
    mode: "pan" | "select"
}

export default function TimelineViewCanvas({
    dim, canvasRefs, handleMouseDown, handleMouseMove, handleMouseUp,
    handleMouseLeave, handleMouseWheel, handleKeyDown, mode
}: TimelineViewCanvasProps) {
    return (
        <>
            {Array.from({ length: dim }).map((_, idx) => (
                <canvas
                    key={idx}
                    ref={(el) => { canvasRefs.current[idx] = el }}
                    tabIndex={0}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onWheel={handleMouseWheel}
                    onKeyDown={handleKeyDown}
                    className={`${mode === "pan" ? "cursor-move" : "cursor-crosshair"}`}
                />
            ))}
        </>
    )
}
