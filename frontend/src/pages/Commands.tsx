import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useCallback, useEffect, useState } from 'react'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import { useCommandBuffer } from '@/hooks/use-command-buffer'
import StatTable from '@/components/charts/stat-table'
import { Card } from '@/components/ui/card'
import { LineChart, BarChart3 } from "lucide-react"
import { useAoSession } from '@/contexts/ao-session-context'
import { fetchTile } from '@/api/command/fetchTile'
import Heatmap from '@/components/charts/heatmap-chart'
import TileHeatmap from '@/components/charts/tile-heatmap-chart'
import LinesChart from '@/components/charts/line-chart'
import Histogram from '@/components/charts/hist-chart'

export default function Commands() {
  const { wfc } = useAoSession()
  const frameBuffer = useCommandBuffer(wfc)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [selectedCell, setSelectedCell] = useState<{ frame: number, col: number, row: number } | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<{ frame: number, index: number } | null>(null)
  const currentFrameData = frameBuffer.getFrame(currentFrame)
  const { scaleType, intervalType } = useChartInteraction()

  const [meta, setMeta] = useState<{
    numFrames: number
    numIndices: number
    overallMin: number
    overallMax: number
    numCols?: number
    numRows?: number
    colRowToIndex?: number[][]
    indexToColRow?: [number, number][]
  } | null>(null)

  useEffect(() => {
    if (frameBuffer.meta) {
      setMeta(frameBuffer.meta)
    }
  }, [frameBuffer.meta])

  const handleCellSelect = useCallback(async (selected: { frame: number, col: number; row: number } | null) => {
    setSelectedCell(selected)
    if (selected) {
      const col = selected.col
      const row = selected.row
      if (meta && meta.colRowToIndex && meta.colRowToIndex[col]?.[row] !== undefined) {
        const index = meta.colRowToIndex[col][row]
        if (index === -1) {
          console.warn("Invalid mask access at", col, row)
          return
        }
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
      const index = selected.index
      const frame = selected.frame
      if (meta.indexToColRow && meta.indexToColRow[index]) {
        const [col, row] = meta.indexToColRow[index]
        setCurrentFrame(frame)
        setSelectedCell({
          frame: frame,
          col: col,
          row: row
        })
        await frameBuffer.fetchPointData(index)
      }
    }
    else {
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
        loopIndex: wfc
      })

      return [json.tile]
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
        {(meta?.numCols && meta.numRows) ?
          <Heatmap
            data={currentFrameData ? [currentFrameData] : []}
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
            Can't render commands. Influence Function not found.
          </div>
        }
      </GridItem>
      <GridItem area="b">
        {meta &&
          <TileHeatmap
            numFrames={meta.numFrames}
            numIndexes={meta.numIndices}
            dim={1}
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
          {frameBuffer.pointData &&
            <LinesChart
              data1X={frameBuffer.pointData.point_means}
              data1Y={[]}
              data2X={[]}
              data2Y={[]}
              config1={selectedCell ? { col: selectedCell.col, row: selectedCell.row } : undefined}
              config2={undefined}
            />
          }
        </GridItem>
        :
        <GridItem area="c" className='flex items-center justify-center'>
          <Card className="p-6 text-center w-95 h-9/11">
            <div className="flex justify-center mb-4">
              <LineChart size={48} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Command Motion by Frame</h3>
            <p className="text-foreground mb-4">
              Click a <span className="font-semibold">Point</span> to show the line chart
            </p>
          </Card>
        </GridItem>
      }
      {
        frameBuffer.pointData ?
          <GridItem area="d">
            {frameBuffer.pointData && meta && (
              <Histogram
                data1X={frameBuffer.pointData.point_means}
                data1Y={[]}
                data2X={[]}
                data2Y={[]}
                config1={selectedCell ? { col: selectedCell.col, row: selectedCell.row } : undefined}
                config2={undefined}
              />
            )}
          </GridItem>
          :
          <GridItem area="d" className='flex items-center justify-center'>
            <Card className="p-6 text-center w-95 h-9/11">
              <div className="flex justify-center mb-4">
                <BarChart3 size={48} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Motion Distribution</h3>
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

