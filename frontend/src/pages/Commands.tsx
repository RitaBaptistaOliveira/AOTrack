import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useMediaQuery } from 'react-responsive'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAoHelper } from '@/hooks/use-ao-helper'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import Visualization from '@/components/charts/heatmap-chart'
import FlapHeatmap from '@/components/charts/heatmap-flat-chart'
import LineChart from '@/components/charts/line-graph'
import HistogramChart from '@/components/charts/histogram-chart'
import StatTable from '@/components/charts/stat-table'
interface CommandProps {
  data: number[][]
  mult_data: number[][][]
  numFrames: number
  numActuators: number
}

export default function Commands() {
  // const isLargeScreen = useMediaQuery({ minWidth: 768 })
  const [currentFrame, setCurrentFrame] = useState(0)
  const [selectedCell, setSelectedCell] = useState<{ frame: number, x: number, y: number, value: number } | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<{ frame: number, index: number, value: number } | null>(null)
  const [lineData, setLineData] = useState<{ x: number; y: number }[]>([])
  const [commandData, setCommandData] = useState<CommandProps | null>(null)
  const { scaleType, intervalType } = useChartInteraction()
  const { getCommands } = useAoHelper()
  const [intensityOverTime, setIntensityOverTime] = useState<{ x: number; y: number }[]>([])

  function getAverageIntensityData(data: number[][]): { x: number; y: number }[] {
    return data.map((frame, i) => {
      const sum = frame.reduce((acc, val) => acc + val, 0)
      const avg = sum / frame.length
      return { x: i, y: avg }
    })
  }

  const handleSelect = useCallback((selected: { frame: number, x: number; y: number | undefined; value: number } | null) => {
    // if (selected && frameData) {
    //   if (selected.y) {
    //     const intensities = frameData.data.map((frame, i) => ({
    //       x: i,
    //       y: frame[selected.x][selected.y!]
    //     }));
    //     setIntensityOverTime(intensities);

    //     setCurrentFrame(selected.frame)
    //     setSelectedCell({
    //       frame: selected.frame,
    //       x: selected.x,
    //       y: selected.y,
    //       value: selected.value
    //     })
    //     setSelectedPoint({
    //       frame: selected.frame,
    //       index: selected.x * frameData.numRows + selected.y,
    //       value: selected.value
    //     })
    //   }
    //   else {
    //     const intensities = flattenedData.map((frame, i) => ({
    //       x: i,
    //       y: frame[selected.x]
    //     }));
    //     setIntensityOverTime(intensities);

    //     setCurrentFrame(selected.frame)
    //     setSelectedCell({
    //       frame: selected.frame,
    //       x: Math.floor(selected.x / frameData.numRows),
    //       y: selected.x % frameData.numRows,
    //       value: selected.value
    //     })
    //     setSelectedPoint({
    //       frame: selected.frame,
    //       index: selected.x,
    //       value: selected.value
    //     })
    //   }
    // } else {
    //   setIntensityOverTime([]);
    // }
  }, [])

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame)
  }, [])

  useEffect(() => {
    getFrames();
  }, [scaleType, intervalType]);

  const getFrames = async () => {
    try {
      const data = await getCommands()
      if (data === null) {
        throw new Error("Invalid command format");
      }
      const original_commands = data.original_data
      const multiplied_data = data.multiplied_data
      const numFrames = original_commands.length;
      const numActuators = original_commands[0]?.length || 0;

      if (numActuators === 0 || numFrames === 0) {
        throw new Error("Invalid data format: Empty commands detected");
      }

      const processedData: CommandProps = {
        data: original_commands,
        mult_data: multiplied_data,
        numFrames: numFrames,
        numActuators: numActuators
      };
      setCommandData(processedData)
    }
    catch (err) {
      console.log(`Error updating data: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <DashboardGrid variant="default">

      <GridItem area="a">
        {commandData && commandData.mult_data !== null && (
          <Visualization
            data={commandData.mult_data}
            numRows={commandData.mult_data[0][0].length}
            numCols={commandData.mult_data[0].length}
            numFrames={commandData.numFrames}
            onCellSelect={handleSelect}
            onFrameChange={handleFrameChange}
            selectedPoint={selectedPoint}
          />
        )}
        <></>
      </GridItem>
      <GridItem area="b">
        {commandData && (
          <FlapHeatmap
            data={commandData.data}
            numRows={commandData.mult_data?.[0]?.[0]?.length ?? 0}
            numIndexes={commandData.numActuators}
            numFrames={commandData.numFrames}
            onPointSelect={handleSelect}
            selectedCell={selectedCell}
          />
        )}
      </GridItem>
      <GridItem area="c"><></></GridItem>
      <GridItem area="d"> <></></GridItem>
      <GridItem area="e"> <></></GridItem>
    </DashboardGrid>
  )
}

