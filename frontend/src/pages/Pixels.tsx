import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useMediaQuery } from 'react-responsive'
import { useCallback, useEffect, useState } from 'react'
import { useAoHelper } from '@/hooks/use-ao-helper'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import Visualization from '@/components/charts/heatmap-chart'
import FlapHeatmap from '@/components/charts/heatmap-flat-chart'
interface FrameProps {
  data: number[][][]
  numRows: number
  numCols: number
  numFrames: number
}

export default function Pixels() {
  const isLargeScreen = useMediaQuery({ minWidth: 768 })
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number; value: number; frame: number } | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<{ frame: number; index: number; value: number } | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [flattenedData, setFlattenedData] = useState<number[][]>([])
  const [frameData, setFrameData] = useState<FrameProps | null>(null)
  const { getPixelIntensities } = useAoHelper();
  const { scaleType, intervalType } = useChartInteraction()

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

  const handleCellSelect = useCallback((cell: { x: number; y: number; value: number; frame: number } | null) => {
    setSelectedCell(cell)
  }, [])

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame)
  }, [])

  const handlePointSelect = useCallback((point: { frame: number; index: number; value: number } | null) => {
    setSelectedPoint(point)
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

      setFlattenedData(flattenFramesArray(frames, numRows, numCols))
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
            onCellSelect={handleCellSelect}
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
            onPointSelect={handlePointSelect}
          />
        )}
      </GridItem>
      <GridItem area="c">Bottom Left (C)</GridItem>
      <GridItem area="d">Bottom Middle (D)</GridItem>
      <GridItem area="e">Bottom Right (E)</GridItem>
    </DashboardGrid>
  )
}
