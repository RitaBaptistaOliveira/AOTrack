import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useMediaQuery } from 'react-responsive'
import { useCallback, useEffect, useState } from 'react'
import { useAoHelper } from '@/hooks/use-ao-helper'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import Visualization from '@/components/charts/heatmap-chart'
import FlapHeatmap from '@/components/charts/heatmap-flat-chart'
import LineChart from '@/components/charts/line-graph'
import HistogramChart from '@/components/charts/histogram-chart'
import StatTable from '@/components/charts/stat-table'
interface FrameProps {
  data: number[][][]
  numRows: number
  numCols: number
  numFrames: number
}

export default function Pixels() {
  const isLargeScreen = useMediaQuery({ minWidth: 768 })
  const [currentFrame, setCurrentFrame] = useState(0)
  const [flattenedData, setFlattenedData] = useState<number[][]>([])
  const [lineData, setLineData] = useState<{ x: number; y: number }[]>([])
  const [frameData, setFrameData] = useState<FrameProps | null>(null)
  const { getPixelIntensities } = useAoHelper();
  const { scaleType, intervalType } = useChartInteraction()
  const [intensityOverTime, setIntensityOverTime] = useState<{ x: number; y: number }[]>([]);


  function flattenFramesArray(data: number[][][], numRows: number, numCols: number): number[][] {
    return data.map((frame) => {
      const flattened: number[] = new Array(numRows * numCols)
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
          const index = row * numCols + col
          flattened[index] = frame[row][col]
        }
      }
      return flattened
    })
  }

  function getAverageIntensityData(data: number[][]): { x: number; y: number }[] {
    return data.map((frame, i) => {
      const sum = frame.reduce((acc, val) => acc + val, 0)
      const avg = sum / frame.length
      return { x: i, y: avg }
    })
  }

  const handleSelect = useCallback((selected: { frame: number, x: number; y: number | undefined; value: number } | null) => {
    if (selected && frameData) {
      if (selected.y) {
        const intensities = frameData.data.map((frame, i) => ({
          x: i,
          y: frame[selected.x][selected.y!]
        }));
        setIntensityOverTime(intensities);
        setCurrentFrame(selected.frame)
      }
      else {
        const intensities = flattenedData.map((frame, i) => ({
          x: i,
          y: frame[i]
        }));
        setIntensityOverTime(intensities);
      }
    } else {
      setIntensityOverTime([]);
    }
  }, [frameData])

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame)
  }, [])

  useEffect(() => {
    getFrames();
  }, [scaleType, intervalType]);

  const getFrames = async () => {
    try {
      const frames = await getPixelIntensities()
      if (!Array.isArray(frames) || frames.length === 0) {
        throw new Error("Invalid data format: Expected 3D array");
      }
      const numFrames = frames.length;
      const numRows = frames[0]?.length || 0;
      const numCols = frames[0]?.[0]?.length || 0;

      if (numRows === 0 || numCols === 0) {
        throw new Error("Invalid data format: Empty frames detected");
      }

      const processedData: FrameProps = {
        data: frames,
        numRows: numRows,
        numCols: numCols,
        numFrames: numFrames,
      };
      setFrameData(processedData);
      const flat = flattenFramesArray(frames, numRows, numCols)
      setFlattenedData(flat)
      setLineData(getAverageIntensityData(flat))

    }
    catch (err) {
      console.log(`Error updating data: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <DashboardGrid variant="default">

      <GridItem area="a">
        {frameData && (
          <Visualization
            data={frameData.data}
            numRows={frameData.numRows}
            numCols={frameData.numCols}
            numFrames={frameData.numFrames}
            onCellSelect={handleSelect}
            onFrameChange={handleFrameChange}
          />
        )}
      </GridItem>
      <GridItem area="b">
        {frameData && (
          <FlapHeatmap
            data={flattenedData}
            numIndexes={frameData.numRows * frameData.numCols}
            numFrames={frameData.numFrames}
            onPointSelect={handleSelect}
          />
        )}
      </GridItem>
      <GridItem area="c"><LineChart data={lineData} selectedPoint={intensityOverTime} /></GridItem>
      <GridItem area="d"><HistogramChart data={lineData} selectedPoint={intensityOverTime} /></GridItem>
      <GridItem area="e"><StatTable data={lineData} /></GridItem>
    </DashboardGrid>
  )
}
