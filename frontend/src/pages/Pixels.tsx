import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useCallback, useEffect, useState } from 'react'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import { useFrameBuffer } from "@/hooks/use-frame-buffer"
import Visualization from '@/components/charts/heatmap-chart'
import FlapHeatmap from '@/components/charts/heatmap-flat-chart-c'
import D3LineChart from '@/components/charts/line-chart'
import Histogram from '@/components/charts/hist-chart'
import StatTable from '@/components/charts/stat-table'
import { Card } from '@/components/ui/card'
import { LineChart, BarChart3 } from "lucide-react"


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
      console.log("Selected:" , selected)
      const numRows = meta.numRows

      if (typeof selected.y === 'number') {
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
        await frameBuffer.fetchPointData(selected.x, selected.y)
      }
      else {
        const col = Math.floor(selected.x / numRows)
        const row = selected.x % numRows
        console.log("Selected cell at col:", col, "row:", row, "value:", selected.value)
        
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
        await frameBuffer.fetchPointData(col, row)
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
            numRows={meta.numRows}
            numIndexes={meta.numCols * meta.numRows}
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
            <h3 className="text-lg font-semibold mb-2">Pixel Intensities by Frame</h3>
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
              <h3 className="text-lg font-semibold mb-2">Intensities Distribution</h3>
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