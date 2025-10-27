import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import { useCommandBuffer } from '@/hooks/use-command-buffer'
import StatTable from '@/components/charts/stat-table'
import { Card } from '@/components/ui/card'
import { LineChart as LN, BarChart3 } from "lucide-react"
import { useAoSession } from '@/contexts/ao-session-context'
import { fetchTile } from '@/api/fetchTile'
import FrameView from '@/components/charts/frame-view/FrameView'
import TimelineView from '@/components/charts/timeline-view/TimelineView'
import LineChart from '@/components/charts/line-chart/LineChart'
import Histogram from '@/components/charts/histogram/Histogram'
import type { Dataset, MultiDataset } from '@/components/charts/common/utils/types'

export default function Commands() {
  const { wfc } = useAoSession()
  const [datasetsLine, setDatasetsLine] = useState<MultiDataset>([])
  const [datasetsContrib, setDatasetsContrib] = useState<MultiDataset>([])
  const [actuatorContrib, setActuatorContrib] = useState<number[][]>([])
  const frameBuffer = useCommandBuffer(wfc)
  const [currentFrame, setCurrentFrame] = useState(0)
  const selectedState = useRef<"point" | "cell" | null>(null)
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

  const handleSetCurrentFrame = useCallback(async (frame: number) => {
    if (selectedCell) {
      setCurrentFrame(frame)
      setSelectedCell(prev => prev ? { ...prev, frame } : null)
      await frameBuffer.fetchPointContributions(selectedCell.col, selectedCell.row, frame)
    }
  }, [])

  const handleCellSelect = useCallback((selected: { frame: number, col: number; row: number } | null) => {
    if (selected) {
      selectedState.current = "cell"
    }
    else {
      frameBuffer.setPupilData(undefined)
      selectedState.current = null
    }

    setSelectedCell(selected)
    setSelectedPoint(null)

  }, [meta])

  const handlePointSelect = useCallback((selected: { frame: number, index: number } | null) => {
    if (selected) {
      selectedState.current = "point"
    }
    else {
      frameBuffer.setActuatorData(undefined)
      selectedState.current = null

    }
    setSelectedPoint(selected)
    setSelectedCell(null)
  }, [meta])

  useEffect(() => {
    const run = async () => {
      switch (selectedState.current) {
        case "point":
          if (selectedPoint) {
            frameBuffer.setPupilData(undefined)
            await frameBuffer.fetchActuatorData(selectedPoint.index, selectedPoint.frame)
          }
          break
        case "cell":
          if (selectedCell) {
            frameBuffer.setActuatorData(undefined)
            await frameBuffer.fetchPointData(selectedCell.col, selectedCell.row, selectedCell.frame)
          }
          break
        default:
          break
      }
    }
    run()
  }, [selectedCell, selectedPoint])

  const handleFetchTile = useCallback(async (frameStart: number, frameEnd: number, indexStart: number, indexEnd: number) => {
    try {
      const json = await fetchTile<number[][]>({
        frameStart,
        frameEnd,
        indexStart,
        indexEnd,
        index: wfc,
        page: "command"
      })

      return [json.tile]
    }
    catch (err) {
      console.warn("Fetch tiles error:", err)
    }
    return []
  }, [])

  useEffect(() => {
    if ((!frameBuffer.pupilData && !frameBuffer.actuatorData)) {
      setDatasetsLine([])
      setDatasetsContrib([])
      setActuatorContrib([])
      return
    }

    if (frameBuffer.pupilData && frameBuffer.actuatorData) {
      return
    }

    let datasetLine = {
      pointId: "Point1",
      dimId: "A",
      data: [] as { x: number; y: number }[],
      color: "#10b981"
    } as Dataset


    if (frameBuffer.pupilData) {
      const datasetContrib = {
        pointId: "Point1",
        dimId: "A",
        data: frameBuffer.pupilData.contributions,
        color: "#10b981"
      } as Dataset
      datasetLine.data = frameBuffer.pupilData.point_vals
      setDatasetsContrib([datasetContrib])
      setActuatorContrib([])
    }
    else if (frameBuffer.actuatorData) {
      datasetLine.data = frameBuffer.actuatorData.point_vals
      setActuatorContrib(frameBuffer.actuatorData.contributions)
      setDatasetsContrib([])
    }
    setDatasetsLine([datasetLine])
  }, [frameBuffer.pupilData, frameBuffer.actuatorData])

  useEffect(() => {
    frameBuffer.preloadAround(currentFrame, 2)
  }, [currentFrame, scaleType, intervalType])

  return (
    <DashboardGrid variant="default">

      <GridItem area="a">
        {displayFrameData && meta && (meta.numCols && meta.numRows) ?
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
                <div>Value: {cell.values[0].toPrecision(2)} m</div>
              </div>
            )}
          />
          :
          <div className='text-center'>
            Can't render commands. Influence Function not found.
          </div>
        }
      </GridItem>
      <GridItem area="b">
        {meta &&
          <TimelineView
            numFrames={meta.numFrames}
            numIndexes={meta.numIndices}
            dim={1}
            minValue={meta.overallMin}
            maxValue={meta.overallMax}
            onPointSelect={handlePointSelect}
            onFetchTile={handleFetchTile}
            onFrameChange={() => { }}
            selectedPoint={selectedPoint}
            formatHover={(cell) => (
              <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm pointer-events-none text-xs">
                <div>Index: {cell.index}</div>
                <div>Value: {cell.values[0].toPrecision(2)} m</div>
              </div>
            )}
          />
        }
      </GridItem>

      {datasetsLine.length > 0 ?
        (frameBuffer.pupilData ?
          <GridItem area="c">
            {frameBuffer.pupilData &&
              <LineChart datasets={datasetsLine} labels={{ title: "Commands by Frame", x: "Frame", y: "m" }} />
            }
          </GridItem>
          :
          <GridItem area="c">
            {frameBuffer.actuatorData &&
              <LineChart datasets={datasetsLine} labels={{ title: "Actuator Commands by Frame", x: "Frame", y: "m" }} />
            }
          </GridItem>
        )
        :
        <GridItem area="c" className='flex items-center justify-center'>
          <Card className="p-6 text-center w-95 h-9/11">
            <div className="flex justify-center mb-4">
              <LN size={48} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Command Motion by Frame</h3>
            <p className="text-foreground mb-4">
              Click a <span className="font-semibold">Point</span> to show the line chart
            </p>
          </Card>
        </GridItem>
      }

      {(datasetsContrib.length > 0 || actuatorContrib.length > 0) ?
        (frameBuffer.pupilData ?
          <GridItem area="d">
            {frameBuffer.pupilData && (
              <Histogram datasets={datasetsContrib} labels={{ title: "Motion Distribution", x: "m" }} />
            )}
          </GridItem>
          :
          <GridItem area="d">
            {meta && frameBuffer.actuatorData && (
              <FrameView
                data={[actuatorContrib]}
                numRows={actuatorContrib.length}
                numCols={actuatorContrib[0].length}
                numFrames={meta.numFrames}
                minValue={Math.min(...actuatorContrib.flat())}
                maxValue={Math.max(...actuatorContrib.flat())}
                selectedCell={null}
                onCellSelect={() => { }}
                onFrameChange={() => { }}
                formatHover={(cell) => (
                  <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm pointer-events-none text-xs">
                    <div>Col: {cell.col}, Row: {cell.row}</div>
                    <div>Value: {cell.values[0].toPrecision(2)} m</div>
                  </div>
                )}
                isControlled={false}
                index={selectedPoint ? selectedPoint.index : 0}
              />
            )}
          </GridItem>
        ) :

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
          <StatTable data={frameBuffer.stats} selectedPoint={frameBuffer.pupilData?.stats || frameBuffer.actuatorData?.stats} />
        }
      </GridItem>

    </DashboardGrid >
  )
}

