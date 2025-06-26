import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useCallback, useEffect, useState } from 'react'
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
  const [selectedCell, setSelectedCell] = useState<{ frame: number, col: number, row: number, value: number } | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<{ frame: number, index: number, value: number } | null>(null)
  const currentFrameData = frameBuffer.getFrame(currentFrame)
  const { scaleType, intervalType } = useChartInteraction()

  const [meta, setMeta] = useState<{
    numFrames: number
    numCols: number
    numRows: number
    overallMin: number
    overallMax: number
  } | null>(null)

  useEffect(() => {
    if (frameBuffer.meta) {
      setMeta(frameBuffer.meta)
    }
  }, [frameBuffer.meta])

  const handleSelect = useCallback(async (selected: { frame: number, x: number; y: number | undefined; value: number } | null) => {
    if (selected && meta) {
      const numRows = meta.numRows

      if (typeof selected.y === 'number') { //If it has a y, it means it comes from the main heatmap, else it came from the flat heatmap
        setCurrentFrame(selected.frame)
        setSelectedCell({
          frame: selected.frame,
          col: selected.x,
          row: selected.y,
          value: selected.value,
        })
        setSelectedPoint({
          frame: selected.frame,
          index: selected.x * numRows + selected.y,
          value: selected.value,
        })
        await frameBuffer.fetchPointStatsData(selected.x, selected.y)
        await frameBuffer.fetchHistogramData({
          col: selected.x,
          row: selected.y
        })
      }
      else {
        const col = Math.floor(selected.x / numRows)
        const row = selected.x % numRows

        setCurrentFrame(selected.frame)
        setSelectedCell({
          frame: selected.frame,
          col: col,
          row: row,
          value: selected.value,
        })
        setSelectedPoint({
          frame: selected.frame,
          index: selected.x,
          value: selected.value
        })
        await frameBuffer.fetchPointStatsData(col, row)
        await frameBuffer.fetchHistogramData({
          col: col,
          row: row
        })
      }
    } else {
      setSelectedCell(null)
      setSelectedPoint(null)
    }
  }, [frameBuffer])

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame)
  }, [])

  const handleNumBinsChange = useCallback((bins: number) => {
    frameBuffer.setNumBins(bins)
    frameBuffer.fetchGlobalHistogramData()
    if (selectedCell) {
      frameBuffer.fetchHistogramData({
        col: selectedCell.col,
        row: selectedCell.row
      })
    }


  }, [])

  useEffect(() => {
    frameBuffer.preloadAround(currentFrame, 5)
  }, [currentFrame, scaleType, intervalType])
  useEffect(() => {
  }, [frameBuffer.meta]);

  return (
    <DashboardGrid variant="default">

      <GridItem area="a">
        {frameBuffer && meta && (
          <Visualization
            data={currentFrameData ? currentFrameData : []}
            numRows={meta.numRows}
            numCols={meta.numCols}
            numFrames={meta.numFrames}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onCellSelect={handleSelect}
            onFrameChange={handleFrameChange}
            selectedPoint={selectedPoint}
          />
        )}
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
      <GridItem area="c">
        {frameBuffer.charts &&
          <LineChart data={frameBuffer.charts.frameMeans} selectedPoint={frameBuffer.pointStatsData?.point_means} />
        }
      </GridItem>
      <GridItem area="d">
        {frameBuffer.globalHistogramData && meta && (
          <HistogramChart
            bins={frameBuffer.globalHistogramData.bins}
            counts={frameBuffer.globalHistogramData.counts}
            numBins={frameBuffer.numBins}
            domain={[meta.overallMin, meta.overallMax]}
            selectedPoint={
              frameBuffer.histogramData
                ? {
                  bins: frameBuffer.histogramData.bins,
                  counts: frameBuffer.histogramData.counts
                }
                : undefined
            }
            onChangeNumBins={handleNumBinsChange}
          />
        )}
      </GridItem>
      <GridItem area="e">
        {frameBuffer.charts &&
          <StatTable data={frameBuffer.charts.stats} selectedPoint={frameBuffer.pointStatsData?.stats}/>
        }
      </GridItem>

    </DashboardGrid>
  )
}