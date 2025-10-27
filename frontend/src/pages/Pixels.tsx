import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useCallback, useEffect, useState } from 'react'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import { useFrameBuffer } from "@/hooks/use-frame-buffer"
import FrameView from '@/components/charts/frame-view/FrameView'
import TimelineView from '@/components/charts/timeline-view/TimelineView'
import LineChart from '@/components/charts/line-chart/LineChart'
import StatTable from '@/components/charts/stat-table'
import Histogram from '@/components/charts/histogram/Histogram'
import { Card } from '@/components/ui/card'
import { LineChart as LN, BarChart3 } from "lucide-react"
import { useAoSession } from '@/contexts/ao-session-context'
import { fetchTile } from '@/api/fetchTile'
import type { Dataset, MultiDataset } from '@/components/charts/common/utils/types'

export default function Pixels() {

  const { wfs } = useAoSession()
  const [datasets, setDatasets] = useState<MultiDataset>([])
  const frameBuffer = useFrameBuffer(wfs)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [selectedCell, setSelectedCell] = useState<{ frame: number, col: number, row: number } | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<{ frame: number, index: number } | null>(null)
  const currentFrameData = frameBuffer.getFrame(currentFrame)
  const { scaleType, intervalType } = useChartInteraction()
  const [displayFrameData, setDisplayFrameData] = useState<number[][] | null>(null)

  useEffect(() => {
    if (currentFrameData) {
      setDisplayFrameData(currentFrameData);
    }
  }, [currentFrameData])

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

  const handleSetCurrentFrame = useCallback((frame: number) => {
    setCurrentFrame(frame)
    setSelectedCell(prev => prev ? { ...prev, frame } : null)
    setSelectedPoint(prev => prev ? { ...prev, frame } : null)
  }, [])

  const handleCellSelect = useCallback(async (selected: { frame: number, col: number, row: number } | null) => {
    setSelectedCell(selected)
    if (selected && meta) {
      const col = selected.col
      const row = selected.row
      const index = col * meta.numRows + row
      setSelectedPoint({
        frame: selected.frame,
        index: index
      })
      await frameBuffer.fetchPointData(col, row)
    } else {
      setSelectedPoint(null)
      frameBuffer.setPointData(undefined)
    }
  }, [meta])

  const handlePointSelect = useCallback(async (selected: { frame: number, index: number } | null) => {
    const isDiffFrameOnly = selected && selectedPoint && selected.frame !== selectedPoint.frame && selected.index === selectedPoint.index
    if (isDiffFrameOnly) {
      handleSetCurrentFrame(selected.frame)
      return
    }

    setSelectedPoint(selected)
    if (selected && meta) {
      const numRows = meta.numRows
      const index = selected.index
      const frame = selected.frame
      const col = Math.floor(index / numRows)
      const row = index % numRows
      setSelectedCell({ frame, col, row })
      setCurrentFrame(frame)
      await frameBuffer.fetchPointData(col, row)
    } else {
      setSelectedCell(null)
      frameBuffer.setPointData(undefined)
    }
  }, [meta, selectedPoint])

  const handleFetchTile = useCallback(async (frameStart: number, frameEnd: number, indexStart: number, indexEnd: number) => {
    try {
      const json = await fetchTile<number[][]>({
        frameStart,
        frameEnd,
        indexStart,
        indexEnd,
        index: wfs,
        page: "pixel"
      })

      return [json.tile]
    }
    catch (err) {
      console.warn("Fetch tiles error:", err)
    }
    return []
  }, [])

  useEffect(() => {
    if (!frameBuffer.pointData) {
      setDatasets([])
      return
    }
    const newDataset = {
      pointId: "Point1",
      dimId: "X",
      data: frameBuffer.pointData.point_vals,
      color: "#10b981"
    } as Dataset

    setDatasets([newDataset])

  }, [frameBuffer.pointData])

  useEffect(() => {
    frameBuffer.preloadAround(currentFrame, 2)
  }, [currentFrame, scaleType, intervalType])

  return (
    <DashboardGrid variant="default">

      <GridItem area="a">
        {displayFrameData && meta && (
          <FrameView
            data={[displayFrameData]}
            numRows={meta.numRows}
            numCols={meta.numCols}
            numFrames={meta.numFrames}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onCellSelect={handleCellSelect}
            onFrameChange={handleSetCurrentFrame}
            selectedCell={selectedCell}
            formatHover={(cell) => (
              <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm pointer-events-none text-xs">
                <div>Col: {cell.col}, Row: {cell.row}</div>
                <div>Value: {cell.values[0].toPrecision(2)} ADU</div>
              </div>
            )}
          />
        )}
      </GridItem>

      <GridItem area="b">
        {meta &&
          <TimelineView
            numFrames={meta.numFrames}
            numIndexes={meta.numCols * meta.numRows}
            dim={1}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onPointSelect={handlePointSelect}
            onFetchTile={handleFetchTile}
            onFrameChange={handleSetCurrentFrame}
            selectedPoint={selectedPoint}
            formatHover={(cell) => (
              <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm pointer-events-none text-xs">
                <div>Index: {cell.index}</div>
                <div>Value: {cell.values[0].toPrecision(2)} ADU</div>
              </div>
            )}
          />
        }

      </GridItem>
      {datasets.length > 0 ?
        <GridItem area="c">
          {frameBuffer.pointData &&
            <LineChart datasets={datasets} labels={{ title: "Pixel Intensities by Frame", x: "Frame", y: "Intensity (ADU)" }} />
          }
        </GridItem>
        :
        <GridItem area="c" className='flex items-center justify-center'>
          <Card className="p-6 text-center w-95 h-9/11">
            <div className="flex justify-center mb-4">
              <LN size={48} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Pixel Intensities by Frame</h3>
            <p className="text-foreground mb-4">
              Click a <span className="font-semibold">Point</span> to show the line chart
            </p>
          </Card>
        </GridItem>
      }

      {datasets.length > 0 ?
        <GridItem area="d">
          <Histogram datasets={datasets} labels={{ title: "Intensity Distribution", x: "Intensity (ADU)" }} />
        </GridItem>
        :
        <GridItem area="d" className='flex items-center justify-center'>
          <Card className="p-6 text-center w-95 h-9/11">
            <div className="flex justify-center mb-4">
              <BarChart3 size={48} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Intensity Distribution</h3>
            <p className="text-foreground mb-4">
              Click a <span className="font-semibold">Point</span> to show the histogram
            </p>
          </Card>
        </GridItem>
      }

      <GridItem area="e">
        {frameBuffer.stats &&
          <StatTable data={frameBuffer.stats} selectedPoint={frameBuffer.pointData?.stats} />
        }
      </GridItem>

    </DashboardGrid>
  )
}