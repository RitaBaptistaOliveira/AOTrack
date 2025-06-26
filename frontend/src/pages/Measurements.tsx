import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useCallback, useEffect, useState } from 'react'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import { useSlopeFrameBuffer } from "@/hooks/use-slope-buffer"
import DualHeatmap from '@/components/dual-charts/heatmap-chart'
import DualFlapHeatmap from '@/components/dual-charts/heatmap-flat-chart'
import DualLineChart from '@/components/dual-charts/line-graph'
import DualHistogramChart from '@/components/dual-charts/histogram-chart'
import DualStatTable from '@/components/dual-charts/stat-table'


export default function Measurements() {
  const frameBuffer = useSlopeFrameBuffer(0)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [selectedCell, setSelectedCell] = useState<{ frame: number, col: number, row: number, values: [number, number] } | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<{ frame: number, index: number, values: [number, number] } | null>(null)
  const currentFrameData = frameBuffer.getFrame(currentFrame)
  const { scaleType, intervalType } = useChartInteraction()

  const [meta, setMeta] = useState<{
    numFrames: number
    numIndices: number
    overallMin: number
    overallMax: number
    numCols?: number
    numRows?: number
  } | null>(null)

  useEffect(() => {
    if (frameBuffer.meta) {
      setMeta(frameBuffer.meta)
    }
  }, [frameBuffer.meta])

  const handleSelect = useCallback(async (selected: { frame: number, x: number; y: number | undefined; values: [number, number] } | null) => {
    if (selected && meta) {
      const numRows = meta.numRows
      if (numRows) {
        if (typeof selected.y === 'number') {
          const index = selected.x * numRows + selected.y
          setCurrentFrame(selected.frame)
          setSelectedCell({
            frame: selected.frame,
            col: selected.x,
            row: selected.y,
            values: selected.values,
          })
          setSelectedPoint({
            frame: selected.frame,
            index: index,
            values: selected.values,
          })
          await frameBuffer.fetchPointStatsData(index)
          await frameBuffer.fetchHistogramData(index)
          console.log(frameBuffer.histogramData)
        }
        else {
          const col = Math.floor(selected.x / numRows)
          const row = selected.x % numRows

          setCurrentFrame(selected.frame)
          setSelectedCell({
            frame: selected.frame,
            col: col,
            row: row,
            values: selected.values,
          })
          setSelectedPoint({
            frame: selected.frame,
            index: selected.x,
            values: selected.values
          })
          await frameBuffer.fetchPointStatsData(selected.x)
          await frameBuffer.fetchHistogramData(selected.x)
          console.log(frameBuffer.histogramData)
        }
      }
      else{
        setCurrentFrame(selected.frame)
        setSelectedPoint({
          frame: selected.frame,
          index: selected.x,
          values: selected.values,
        })
        await frameBuffer.fetchPointStatsData(selected.x)
        await frameBuffer.fetchHistogramData(selected.x)
        console.log(frameBuffer.histogramData)
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
    if (selectedPoint) {
      frameBuffer.fetchHistogramData(selectedPoint.index)
    }
  }, [])

  useEffect(() => {
    if (meta) {
      frameBuffer.preloadAround(currentFrame, 2, meta.numFrames)
    }

  }, [currentFrame, scaleType, intervalType])
  useEffect(() => {
  }, [frameBuffer.meta]);

  return (
    <DashboardGrid variant="default">

      <GridItem area="a">
        {(meta?.numCols && meta.numRows)
          ?
          <DualHeatmap
            data={currentFrameData ? [currentFrameData.x, currentFrameData.y] : [[[]], [[]]]}
            numRows={meta.numRows}
            numCols={meta.numCols}
            numFrames={meta.numFrames}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onCellSelect={handleSelect}
            onFrameChange={handleFrameChange}
            selectedPoint={selectedPoint}
          />
          :
          <div className='text-center'>
            Can't render measurements. subaperture_mask not found.
          </div>
        }

        <></>
      </GridItem>
      <GridItem area="b">
        {meta &&
          <DualFlapHeatmap
            numFrames={meta.numFrames}
            numIndexes={meta.numIndices}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onPointSelect={handleSelect}
            selectedCell={selectedCell}
          />
        }

      </GridItem>
      <GridItem area="c">
        {frameBuffer.charts &&
          <DualLineChart data={frameBuffer.charts.frameMeans} selectedPoint={frameBuffer.pointStatsData?.point_means} />
        }
      </GridItem>
      <GridItem area="d">
        {frameBuffer.globalHistogramData && meta &&
          <DualHistogramChart
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
        }
      </GridItem>
      <GridItem area="e">
        {frameBuffer.charts &&
          <DualStatTable data={frameBuffer.charts.stats} selectedPoint={frameBuffer.pointStatsData?.stats} />
        }
      </GridItem>

    </DashboardGrid>
  )
}