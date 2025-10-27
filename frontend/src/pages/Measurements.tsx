import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useCallback, useEffect, useState } from 'react'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import { useSlopeFrameBuffer } from "@/hooks/use-slope-buffer"
import FrameView from '@/components/charts/frame-view/FrameView'
import DualStatTable from '@/components/charts/stat-table'
import { Card } from '@/components/ui/card'
import { LineChart as LN, BarChart3 } from "lucide-react"
import { useAoSession } from '@/contexts/ao-session-context'
import { fetchTile } from '@/api/fetchTile'
import TimelineView from '@/components/charts/timeline-view/TimelineView'
import LineChart from '@/components/charts/line-chart/LineChart'
import type { Dataset, MultiDataset } from '@/components/charts/common/utils/types'
import Histogram from '@/components/charts/histogram/Histogram'

export default function Measurements() {
  const { wfs } = useAoSession()
  const [datasets, setDatasets] = useState<MultiDataset>([])
  const frameBuffer = useSlopeFrameBuffer(wfs)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [selectedCell, setSelectedCell] = useState<{ frame: number, col: number, row: number } | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<{ frame: number, index: number } | null>(null)
  const currentFrameData = frameBuffer.getFrame(currentFrame)
  const { scaleType, intervalType } = useChartInteraction()
  const [displayFrameData, setDisplayFrameData] = useState<number[][][] | null>(null)

  useEffect(() => {
    if (currentFrameData) {
      setDisplayFrameData([currentFrameData.x, currentFrameData.y]);
    }
  }, [currentFrameData])

  const [meta, setMeta] = useState<{
    numFrames: number
    numIndices: number
    dim: number
    overallMin: number
    overallMax: number
    numCols?: number
    numRows?: number
    subapertureMask?: number[][]
    unit?: string
  } | null>(null)


  useEffect(() => {
    if (frameBuffer.meta) {
      if (frameBuffer.meta.unit === undefined) {
        frameBuffer.meta.unit = "(raw)"
      }
      setMeta(frameBuffer.meta)
    }
  }, [frameBuffer.meta])

  const handleSetCurrentFrame = useCallback((frame: number) => {
    setCurrentFrame(frame)
    setSelectedCell(prev => prev ? { ...prev, frame } : null)
    setSelectedPoint(prev => prev ? { ...prev, frame } : null)
  }, [])


  const handleCellSelect = useCallback(async (selected: { frame: number, col: number; row: number } | null) => {
    setSelectedCell(selected)
    if (selected && meta) {
      const col = selected.col
      const row = selected.row
      const mask = meta?.subapertureMask
      const index = mask?.[col][row]
      if (index === undefined || index === -1) {
        console.warn("Invalid mask access at", col, row)
        return
      } else {
        setSelectedPoint({
          frame: selected.frame,
          index: index
        })
        await frameBuffer.fetchPointData(index)
      }
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
      const mask = meta.subapertureMask
      const index = selected.index
      const frame = selected.frame
      if (mask) {
        const col = mask.findIndex(col => col.includes(index))
        if (col === -1) {
          console.warn("Invalid mask access for index ", index)
          setSelectedCell(null)
          return
        }
        const row = mask[col].indexOf(index)
        setCurrentFrame(frame)
        setSelectedCell({ frame, col, row })
      }
      await frameBuffer.fetchPointData(index)
    } else {
      setSelectedCell(null)
      frameBuffer.setPointData(undefined)
    }
  }, [meta, selectedPoint])


  const handleFetchTile = useCallback(async (frameStart: number, frameEnd: number, indexStart: number, indexEnd: number) => {
    try {
      const json = await fetchTile<number[][][]>({
        frameStart,
        frameEnd,
        indexStart,
        indexEnd,
        index: wfs,
        page: "slope"
      })

      return json.tile
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
    let newDatasets = [] as MultiDataset
    if (meta) {
      for (let d = 0; d < meta.dim; d++) {
        console.log(d)
        const newDataset = {
          pointId: `Point${d}`,
          dimId: "",
          data: frameBuffer.pointData.point_vals[d],
          color: "#10b981"
        } as Dataset
        newDatasets.push(newDataset)
      }
    }
    setDatasets(newDatasets)

  }, [frameBuffer.pointData])

  useEffect(() => {
    frameBuffer.preloadAround(currentFrame, 2)
  }, [currentFrame, scaleType, intervalType])

  return (
    <DashboardGrid variant="default">

      <GridItem area="a">
        { displayFrameData && meta && (meta.numCols && meta.numRows && meta.subapertureMask) ?
          <FrameView
            data={displayFrameData}
            numRows={meta.numRows}
            numCols={meta.numCols}
            numFrames={meta.numFrames}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onCellSelect={handleCellSelect}
            onFrameChange={handleSetCurrentFrame}
            selectedCell={selectedCell}
            formatHover={(cell) => (
              <div className="absolute top-1 left-1 bg-black text-white px-2 py-1 rounded pointer-events-none text-xs">
                <div>Col: {cell.col}, Row: {cell.row}</div>
                <div>X Value: {cell.values[0].toPrecision(2)} {meta.unit}</div>
                <div>Y Value: {cell.values[1].toPrecision(2)} {meta.unit}</div>
              </div>
            )}
          />
          :
          <div className='text-center'>
            Can't render measurements. subaperture_mask not found.
          </div>
        }
      </GridItem>

      <GridItem area="b">
        {meta &&
          <TimelineView
            numFrames={meta.numFrames}
            numIndexes={meta.numIndices}
            dim={meta.dim}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onPointSelect={handlePointSelect}
            onFetchTile={handleFetchTile}
            onFrameChange={handleSetCurrentFrame}
            selectedPoint={selectedPoint}
            formatHover={(cell) => (
              <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm pointer-events-none text-xs">
                <div>Index: {cell.index}</div>
                <div>X Value: {cell.values[0].toPrecision(2)} {meta.unit}</div>
                <div>Y Value: {cell.values[1].toPrecision(2)} {meta.unit}</div>
              </div>
            )}
          />
        }
      </GridItem>

      {datasets.length > 0 ?
        <GridItem area="c">
          <LineChart datasets={datasets} labels={{ title: "Measurements by Frame", x: "Frame", y: meta?.unit }} />
        </GridItem>
        :
        <GridItem area="c" className='flex items-center justify-center'>
          <Card className="p-6 text-center w-95 h-9/11">
            <div className="flex justify-center mb-4">
              <LN size={48} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Measurements by Frame</h3>
            <p className="text-foreground mb-4">
              Click a <span className="font-semibold">Point</span> to show the line chart
            </p>
          </Card>
        </GridItem>
      }

      {datasets.length > 0 ?
        <GridItem area="d">
          <Histogram datasets={datasets} labels={{ title: "Measurements Distribution", x: meta?.unit }} />
        </GridItem>
        :
        <GridItem area="d" className='flex items-center justify-center'>
          <Card className="p-6 text-center w-95 h-9/11">
            <div className="flex justify-center mb-4">
              <BarChart3 size={48} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Measurements Distribution</h3>
            <p className="text-foreground mb-4">
              Click a <span className="font-semibold">Point</span> to show the histogram
            </p>
          </Card>
        </GridItem>
      }
      <GridItem area="e">
        {frameBuffer.stats &&
          <DualStatTable data={frameBuffer.stats} selectedPoint={frameBuffer.pointData?.stats} />
        }
      </GridItem>

    </DashboardGrid>
  )
}