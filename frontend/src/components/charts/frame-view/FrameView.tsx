import { useRef, useEffect, useState } from "react"
import FrameViewHeader from "./FrameViewHeader"
import FrameViewCanvas from "./FrameViewCanvas"
import HeatmapLegend from "../common/HeatmapLegend"

import FrameSlider from "../../controls/frame-slider"
import ControlBar from "../../controls/control-bar"

import { useAnimation } from "./hooks/use-animation"
import { useColorScale } from "./hooks/use-color-scale"
import { useCellHover } from "./hooks/use-cell-hover"
import { useSelection } from "./hooks/use-selection"

import { useChartInteraction } from "@/contexts/chart-interactions-context"
import { useCanvas } from "@/hooks/canvas/use-canvas"
import { drawHeatmap } from "@/utils"


interface FrameViewVisualizationProps {
  data: number[][][]
  numRows: number
  numCols: number
  numFrames: number
  minValue: number
  maxValue: number
  onCellSelect: (cell: { frame: number, col: number, row: number } | null) => void
  onFrameChange: (frame: number) => void
  selectedCell: { frame: number, col: number, row: number } | null
  formatHover: (cell: { col: number, row: number, values: number[] }) => React.ReactNode
  isControlled?: boolean
  index?: number
}

export default function FrameView({
  data,
  numRows,
  numCols,
  numFrames,
  minValue,
  maxValue,
  onCellSelect,
  onFrameChange,
  selectedCell,
  formatHover,
  isControlled = true,
  index
}: FrameViewVisualizationProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [showTooltips, setShowTooltips] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showControlBar, setShowControlBar] = useState(true)

  const { colorMap, scaleType, intervalType } = useChartInteraction()
  const { colorScale, gradientStops } = useColorScale(data, colorMap, scaleType, intervalType, minValue, maxValue)

  const drawFn = (canvases: HTMLCanvasElement[], offset: { x: number, y: number }, zoom: number) => {
    canvases.forEach((canvas, i) => {
      drawHeatmap(canvas, offset, zoom, data[i], numRows, numCols, selectedCell, colorScale)
    })
  }

  const { mode, setMode, clickPosition, hoverPos, offsetRef, zoomRef, zoomIn, zoomOut, reset, handleMouseDown, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, handleKeyDown, downloadPNG, scheduleDraw } =
    useCanvas(canvasRefs, drawFn)

  const { prevFrameRef, handleFrameChange } = useAnimation(isPlaying, numFrames, onFrameChange, setIsPlaying, scheduleDraw, selectedCell)
  useSelection(clickPosition, canvasRefs, data, numCols, numRows, offsetRef, zoomRef, onCellSelect, prevFrameRef)
  const hoveredCell = useCellHover(hoverPos, canvasRefs, numCols, numRows, data, offsetRef, zoomRef, showTooltips)

  useEffect(() => {
    scheduleDraw()
  }, [selectedCell])

  useEffect(() => {
    if (!isControlled) {
      setMode("pan")
    }
  }, [isControlled])

  useEffect(() => {
    if (selectedCell) {
      handleFrameChange(selectedCell.frame)
    }
    scheduleDraw()
  }, [selectedCell, data])

  return (
    isControlled ?
      <div className="h-full flex flex-col">

        <FrameViewHeader
          currentFrame={prevFrameRef.current}
          showControlBar={showControlBar}
          setShowControlBar={setShowControlBar}
        />

        {showControlBar &&
          <ControlBar
            mode={mode}
            onModeChange={setMode}
            showTooltips={showTooltips}
            showLegend={showLegend}
            onToggleTooltips={() => setShowTooltips((prev) => !prev)}
            onToggleLegend={() => setShowLegend((prev) => !prev)}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetZoom={reset}
            onDownloadPNG={downloadPNG}
          />
        }

        {/* Canvas Container */}
        <div className="flex-1 relative min-h-0">
          <div className="w-full h-full border-1 border-gray-300">
            <div className="flex flex-row h-full gap-2 relative">
              <FrameViewCanvas
                data={data}
                canvasRefs={canvasRefs}
                handleMouseDown={handleMouseDown}
                handleMouseMove={handleMouseMove}
                handleMouseUp={handleMouseUp}
                handleMouseLeave={handleMouseLeave}
                handleMouseWheel={handleMouseWheel}
                handleKeyDown={handleKeyDown}
                mode={mode}
              />
            </div>
            {hoveredCell && showTooltips && <div>{formatHover(hoveredCell)}</div>}

            {showLegend && <HeatmapLegend minValue={minValue} maxValue={maxValue} gradientStops={gradientStops} />}
          </div>
        </div>

        {/* Frame Controls */}
        <div className="mt-2 flex-shrink-0">
          <FrameSlider
            totalFrames={numFrames}
            currentFrame={prevFrameRef.current}
            setCurrentFrame={(frame) => handleFrameChange(frame)}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
          />
        </div>
      </div>

      :

      <div className="h-full flex flex-col">

        <h2 className="text-lg font-semibold">Actuator {index} Influence</h2>
        <div className="flex-1 relative min-h-0">
          <div className="w-full h-full border-1 border-gray-300">
            <div className="flex flex-row h-full gap-2 relative">
              <FrameViewCanvas
                data={data}
                canvasRefs={canvasRefs}
                handleMouseDown={handleMouseDown}
                handleMouseMove={handleMouseMove}
                handleMouseUp={handleMouseUp}
                handleMouseLeave={handleMouseLeave}
                handleMouseWheel={handleMouseWheel}
                handleKeyDown={handleKeyDown}
                mode={"pan"}
              />
            </div>
            {hoveredCell && showTooltips && <div>{formatHover(hoveredCell)}</div>}

            {showLegend && <HeatmapLegend minValue={minValue} maxValue={maxValue} gradientStops={gradientStops} />}
          </div>
        </div>
      </div>
  )
}
