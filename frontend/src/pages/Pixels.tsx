import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import { useFrameBuffer } from "@/hooks/use-frame-buffer"
import Visualization from '@/components/charts/heatmap-chart'
import FlapHeatmap from '@/components/charts/heatmap-flat-chart'
import LineChart from '@/components/charts/line-graph'
import HistogramChart from '@/components/charts/histogram-chart'
import StatTable from '@/components/charts/stat-table'

export default function Pixels() {
  const frameBuffer = useFrameBuffer(0)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [selectedCell, setSelectedCell] = useState<{ frame: number, x: number, y: number, value: number } | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<{ frame: number, index: number, value: number } | null>(null)
  const [lineData, setLineData] = useState<{ x: number; y: number }[]>([])
  const currentFrameData = frameBuffer.getFrame(currentFrame)
  const { scaleType, intervalType } = useChartInteraction()
  const [intensityOverTime, setIntensityOverTime] = useState<{ x: number; y: number }[]>([]);

  const [meta, setMeta] = useState<{
    numFrames: number
    numCols: number
    numRows: number
    overallMin: number
    overallMax: number
  } | null>(null)

  // function getAverageIntensityData(data: number[][]): { x: number; y: number }[] {
  //   return data.map((frame, i) => {
  //     const sum = frame.reduce((acc, val) => acc + val, 0)
  //     const avg = sum / frame.length
  //     return { x: i, y: avg }
  //   })
  // }
  useEffect(() => {
    if (frameBuffer.meta) {
      setMeta(frameBuffer.meta)
    }
  }, [frameBuffer.meta])


  const handleSelect = useCallback((selected: { frame: number, x: number; y: number | undefined; value: number } | null) => {
    if (selected && frameBuffer) {
      if (selected.y) { //If it has a y, it means it comes from the main heatmap, else it came from the flat heatmap
        // const intensities = frameData.data.map((frame, i) => ({
        //   x: i,
        //   y: frame[selected.x][selected.y!]
        // }));
        // setIntensityOverTime(intensities);

        // setCurrentFrame(selected.frame)
        // setSelectedCell({
        //   frame: selected.frame,
        //   x: selected.x,
        //   y: selected.y,
        //   value: selected.value
        // })
        // setSelectedPoint({
        //   frame: selected.frame,
        //   index: selected.x * frameData.numRows + selected.y,
        //   value: selected.value
        // })
      }
      else {
        // const intensities = flattenedData.map((frame, i) => ({
        //   x: i,
        //   y: frame[selected.x]
        // }));
        // setIntensityOverTime(intensities);

        // setCurrentFrame(selected.frame)
        // setSelectedCell({
        //   frame: selected.frame,
        //   x: Math.floor(selected.x / frameData.numRows),
        //   y: selected.x % frameData.numRows,
        //   value: selected.value
        // })
        // setSelectedPoint({
        //   frame: selected.frame,
        //   index: selected.x,
        //   value: selected.value
        // })
      }
    } else {
      setIntensityOverTime([]);
    }
  }, [frameBuffer])

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame)
  }, [])

  useEffect(() => {
    frameBuffer.preloadAround(currentFrame, 5)
  }, [currentFrame, scaleType, intervalType])

  return (
    <DashboardGrid variant="default">

      <GridItem area="a">
        {/* {frameBuffer && (
          <Visualization
            data={currentFrameData ? [currentFrameData] : []}
            numRows={numRows.current}
            numCols={numCols.current}
            numFrames={numFrames.current}
            onCellSelect={handleSelect}
            onFrameChange={handleFrameChange}
            selectedPoint={selectedPoint}
          />
        )} */}
        <></>
      </GridItem>
      <GridItem area="b">
        {meta &&
          <FlapHeatmap
            numFrames={meta.numFrames}
            numIndexes={meta.numCols * meta.numRows}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onPointSelect={handleSelect}
            selectedCell={selectedCell}
          />}

      </GridItem>
      <GridItem area="c"><LineChart data={lineData} selectedPoint={intensityOverTime} /></GridItem>
      <GridItem area="d"><HistogramChart data={lineData} selectedPoint={intensityOverTime} /></GridItem>
      <GridItem area="e"><StatTable data={lineData} /></GridItem>
    </DashboardGrid>
  )
}
