import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useCallback, useEffect, useState } from 'react'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import { useSlopeFrameBuffer } from "@/hooks/use-slope-buffer"
import Heatmap from '@/components/charts/heatmap-chart'
import TileHeatmap from '@/components/charts/tile-heatmap-chart'
import LinesChart from '@/components/charts/line-chart'
import DualStatTable from '@/components/charts/stat-table'
import Histogram from '@/components/charts/hist-chart'
import { Card } from '@/components/ui/card'
import { LineChart, BarChart3 } from "lucide-react"
import { useAoSession } from '@/contexts/ao-session-context'
import { fetchTile } from '@/api/slope/fetchTile'

export default function Measurements() {
  const { wfs } = useAoSession()
  const frameBuffer = useSlopeFrameBuffer(wfs)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [selectedCell, setSelectedCell] = useState<{ frame: number, col: number, row: number } | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<{ frame: number, index: number } | null>(null)
  const currentFrameData = frameBuffer.getFrame(currentFrame)
  const { scaleType, intervalType } = useChartInteraction()

  const [meta, setMeta] = useState<{
    numFrames: number
    numIndices: number
    dim: number
    overallMin: number
    overallMax: number
    numCols?: number
    numRows?: number
    subapertureMask?: number[][]
  } | null>(null)

  useEffect(() => {
    if (frameBuffer.meta) {
      setMeta(frameBuffer.meta)
    }
  }, [frameBuffer.meta])

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
  }, [meta])

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame)
    setSelectedCell(prev => prev ? { ...prev, frame } : null)
    setSelectedPoint(prev => prev ? { ...prev, frame } : null)
  }, [])

  const handleFetchTile = useCallback(async (frameStart: number, frameEnd: number, indexStart: number, indexEnd: number) => {
    try {
      const json = await fetchTile({
        frameStart,
        frameEnd,
        indexStart,
        indexEnd,
        wfsIndex: wfs
      })

      return json.tiles
    }
    catch (err) {
      console.warn("Fetch tiles error:", err)
    }
    return []
  }, [])

  useEffect(() => {
    frameBuffer.preloadAround(currentFrame, 2)
  }, [currentFrame, scaleType, intervalType])

  return (
    <DashboardGrid variant="default">

      <GridItem area="a">
        {(meta?.numCols && meta.numRows && meta.subapertureMask)
          ?
          <Heatmap
            data={currentFrameData ? [currentFrameData.x, currentFrameData.y] : [[[]], [[]]]}
            numRows={meta.numRows}
            numCols={meta.numCols}
            numFrames={meta.numFrames}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onCellSelect={handleCellSelect}
            onFrameChange={handleFrameChange}
            selectedCell={selectedCell}
          />
          :
          <div className='text-center'>
            Can't render measurements. subaperture_mask not found.
          </div>
        }
      </GridItem>

      <GridItem area="b">
        {meta &&
          <TileHeatmap
            numFrames={meta.numFrames}
            numIndexes={meta.numIndices}
            dim={meta.dim}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onPointSelect={handlePointSelect}
            onFetchTile={handleFetchTile}
            selectedPoint={selectedPoint}
          />
        }
      </GridItem>

      {frameBuffer.pointData ?
        <GridItem area="c">
          <LinesChart
            data1X={frameBuffer.pointData.point_means[0]}
            data1Y={frameBuffer.pointData.point_means[1]}
            data2X={[]}
            data2Y={[]}
            config1={selectedCell ? { col: selectedCell.col, row: selectedCell.row } : undefined}
            config2={undefined}
          />
        </GridItem>
        :
        <GridItem area="c" className='flex items-center justify-center'>
          <Card className="p-6 text-center w-95 h-9/11">
            <div className="flex justify-center mb-4">
              <LineChart size={48} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Measurements by Frame</h3>
            <p className="text-foreground mb-4">
              Click a <span className="font-semibold">Point</span> to show the line chart
            </p>
          </Card>
        </GridItem>
      }

      {frameBuffer.pointData ?
        <GridItem area="d">
          <Histogram
            data1X={frameBuffer.pointData.point_means[0]}
            data1Y={frameBuffer.pointData.point_means[1]}
            data2X={[]}
            data2Y={[]}
            config1={selectedCell ? { col: selectedCell.col, row: selectedCell.row } : undefined}
            config2={undefined}
          />
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