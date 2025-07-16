import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useCallback, useEffect, useState } from 'react'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import { useSlopeFrameBuffer } from "@/hooks/use-slope-buffer"
import DualHeatmap from '@/components/dual-charts/heatmap-chart'
import DualFlapHeatmap from '@/components/dual-charts/heatmap-flat-chart'
import DualLineChart from '@/components/dual-charts/line-chart'
import DualStatTable from '@/components/dual-charts/stat-table'
import DualHistogram from '@/components/dual-charts/hist-chart'
import { Card } from '@/components/ui/card'
import { LineChart, BarChart3 } from "lucide-react"


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
    subapertureMask?: number[][]
  } | null>(null)

  useEffect(() => {
    if (frameBuffer.meta) {
      setMeta(frameBuffer.meta)
    }
  }, [frameBuffer.meta])

  const handleSelect = useCallback(async (selected: { frame: number, x: number; y: number | undefined; values: [number, number] } | null) => {
    if (selected && meta) {
      const mask = meta.subapertureMask
      const numRows = meta.numRows || 1
      const numCols = meta.numCols || 1
      console.log("Selected:", selected)
      if (mask) {
        if (typeof selected.y === 'number') {
          const col = selected.x
          const row = selected.y
          const index = mask[col]?.[row]
          console.log("IF: Selected cell at col:", col, "row:", row, "index:", index)
          if (index === undefined || index === -1) {
            console.warn("Invalid mask access at", col, row)
            return
          }
          setCurrentFrame(selected.frame)
          setSelectedCell({ frame: selected.frame, col, row, values: selected.values })
          setSelectedPoint({
            frame: selected.frame,
            index: index,
            values: selected.values,
          })
          await frameBuffer.fetchPointData(index)
        }
        else {
          let found = false
          for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
              if (mask[c][r] === selected.x) {
                console.log("ELSE: Selected cell at col:", c, "row:", r, "index:", selected.x)
                setCurrentFrame(selected.frame)
                setSelectedCell({ frame: selected.frame, col: c, row: r, values: selected.values })
                setSelectedPoint({ frame: selected.frame, index: selected.x, values: selected.values })
                await frameBuffer.fetchPointData(selected.x)
                found = true
                break
              }
            }
            if (found) break
          }
          if (!found) {
            console.warn("Index not found in mask:", selected.x)
            setSelectedPoint({ frame: selected.frame, index: selected.x, values: selected.values })
            await frameBuffer.fetchPointData(selected.x)
          }
        }
      }
      else {
        setCurrentFrame(selected.frame)
        setSelectedPoint({
          frame: selected.frame,
          index: selected.x,
          values: selected.values,
        })
        await frameBuffer.fetchPointData(selected.x)
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
    frameBuffer.preloadAround(currentFrame, 2)

    console

  }, [currentFrame, scaleType, intervalType])

  return (
    <DashboardGrid variant="default">

      <GridItem area="a">
        {(meta?.numCols && meta.numRows && meta.subapertureMask)
          ?
          <DualHeatmap
            data={currentFrameData ? [currentFrameData.x, currentFrameData.y] : [[[]], [[]]]}
            numRows={meta.numRows}
            numCols={meta.numCols}
            mask={meta.subapertureMask}
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
            mask={meta.subapertureMask || undefined}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onPointSelect={handleSelect}
            selectedCell={selectedCell}
          />
        }

      </GridItem>
      {frameBuffer.pointData ?
        <GridItem area="c">
          <DualLineChart
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
          <DualHistogram
            data1X={frameBuffer.pointData.point_means[0]}
            data1Y={frameBuffer.pointData.point_means[1]}
            data2X={[]}
            data2Y={[]}
            config1={selectedCell ? { col: selectedCell.col, row: selectedCell.row } : undefined}
            config2={undefined}
          />
          <></>
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