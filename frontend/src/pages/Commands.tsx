import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useCallback, useEffect, useState } from 'react'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import { useCommandBuffer } from '@/hooks/use-command-buffer'
import Visualization from '@/components/charts/heatmap-chart'
import FlapHeatmap from '@/components/charts/heatmap-flat-chart'
import D3LineChart from '@/components/charts/line-chart'
import Histogram from '@/components/charts/hist-chart'
import StatTable from '@/components/charts/stat-table'
import { Card } from '@/components/ui/card'
import { LineChart, BarChart3 } from "lucide-react"
import { useAoSession } from '@/contexts/ao-session-context'

export default function Commands() {
  const {wfc} = useAoSession()
  const frameBuffer = useCommandBuffer(wfc)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [selectedCell, setSelectedCell] = useState<{ frame: number, col: number, row: number, value: number } | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<{ frame: number, index: number, value: number } | null>(null)
  const currentFrameData = frameBuffer.getFrame(currentFrame)
  const { scaleType, intervalType } = useChartInteraction()

  const [meta, setMeta] = useState<{
    numFrames: number
    numIndices: number
    overallMin: number
    overallMax: number
    numRows?: number
    numCols?: number
    colRowToIndex?: number[][]
    indexToColRow?: [number, number][]
  } | null>(null)

  useEffect(() => {
    if (frameBuffer.meta) {
      setMeta(frameBuffer.meta)
    }
  }, [frameBuffer.meta])

  const handleSelect = useCallback(async (selected: { frame: number, x: number; y: number | undefined; value: number } | null) => {
    if (selected && meta) {
      const { frame, x, y, value } = selected

      if (typeof y === 'number' &&
        meta.colRowToIndex &&
        meta.colRowToIndex[x]?.[y] !== undefined) {
        const i = meta.colRowToIndex[x][y]
        if (i === -1) {
          console.warn("Selected cell is invalid (NaN region).")
          return
        }
        setCurrentFrame(frame)
        setSelectedCell({
          frame: frame,
          col: x,
          row: y,
          value: value,
        })
        setSelectedPoint({
          frame: frame,
          index: i,
          value: value,
        })
        await frameBuffer.fetchPointData(i)
      }
      else {
        setCurrentFrame(frame)

        if (meta.indexToColRow && meta.indexToColRow[x] !== undefined) {
          const index = x
          const [col, row] = meta.indexToColRow[index]
          setSelectedCell({
            frame: frame,
            col: col,
            row: row,
            value: value,
          })
        }

        setSelectedPoint({
          frame: frame,
          index: x,
          value: value
        })
        await frameBuffer.fetchPointData(x)
      }
    } else {
      setSelectedCell(null)
      setSelectedPoint(null)
      frameBuffer.setPointData(undefined)
    }
  }, [frameBuffer])

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame)
  }, [])

  useEffect(() => {
    frameBuffer.preloadAround(currentFrame, 5)
    console.log(`Preloading frames around ${currentFrame} with scaleType: ${scaleType}, intervalType: ${intervalType}`)
    console.log("Current frame data:", currentFrameData)
  }, [currentFrame, scaleType, intervalType])

  return (
    <DashboardGrid variant="default">

      <GridItem area="a">
        {(meta?.numCols && meta.numRows) ?
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
          :
          <div className='text-center'>
            Can't render commands. Influence Function not found.
          </div>
        }
      </GridItem>
      <GridItem area="b">
        {meta &&
          <FlapHeatmap
            numFrames={meta.numFrames}
            numRows={meta.numRows ?? 0}
            numIndexes={meta.numIndices}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onPointSelect={handleSelect}
            selectedCell={selectedCell}
          />}

      </GridItem>

      {frameBuffer.pointData ?
        <GridItem area="c">
          {frameBuffer.pointData &&
            <D3LineChart
              data1={frameBuffer.pointData?.point_means || []}
              data2={[]}
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
                data1={frameBuffer.pointData?.point_means || []}
                data2={[]}
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

