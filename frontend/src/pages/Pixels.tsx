import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useMediaQuery } from 'react-responsive'
import { useCallback, useEffect, useState } from 'react'
import { useAoHelper } from '@/hooks/use-ao-helper'
import { useChartInteraction } from '@/contexts/chart-interactions-context'
import Visualization from '@/components/charts/heatmap-chart'
interface FrameProps {
  data: number[][][]
  numRows: number
  numCols: number
  numFrames: number
}

export default function Pixels() {
  const isLargeScreen = useMediaQuery({ minWidth: 768 })
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number; value: number; frame: number } | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [frameData, setFrameData] = useState<FrameProps | null>(null)
  const { getPixelIntensities } = useAoHelper();
  const { scaleType, intervalType } = useChartInteraction()

  const handleCellSelect = useCallback((cell: { x: number; y: number; value: number; frame: number } | null) => {
    setSelectedCell(cell)
  }, [])

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
    }
    catch (err) {
      console.log(`Error updating data: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <DashboardGrid variant="simple">
      <GridItem area="a">
        {frameData &&
          <Visualization
            data={frameData.data}
            numRows={frameData.numRows}
            numCols={frameData.numCols}
            numFrames={frameData.numFrames}
            onCellSelect={handleCellSelect}
            onFrameChange={handleFrameChange}
          />}
      </GridItem>
      <GridItem area="b">A</GridItem>
      <GridItem area="c">E (Right Middle)</GridItem>

      {isLargeScreen ? (
        <div style={{ gridArea: "de" }} className={`flex gap-4 rounded`}>
          <GridItem area="d" className='flex-1'>(Left Bottom Left)</GridItem>
          <GridItem area="e" className='flex-1'>(Left Bottom Right)</GridItem>
        </div>
      ) : (
        <>
          <GridItem area="d">B (Left Bottom Left)</GridItem>
          <GridItem area="e">C (Left Bottom Right)</GridItem>
        </>
      )}

      <GridItem area="f">F (Right Bottom)</GridItem>
    </DashboardGrid>
  )
}
