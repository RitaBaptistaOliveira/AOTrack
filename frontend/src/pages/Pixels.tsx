import HeatmapChart from '@/components/charts/heatmap-chart'
import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useMediaQuery } from 'react-responsive'
import { useCallback, useEffect, useState } from 'react'
import HeatmapVisualization from '@/components/charts/heatmap-visualization'
import { useAoHelper } from '@/hooks/use-ao-helper'

interface FrameProps {
  frameData: number[][][]
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
  const array3x3x3: number[][][] = [
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ],
    [
      [0, 11, 12],
      [13, 14, 15],
      [16, 17, 18]
    ],
    [
      [19, 20, 21],
      [22, 23, 24],
      [25, 26, 27]
    ]
  ];

  const handleCellSelect = useCallback((cell: { x: number; y: number; value: number; frame: number } | null) => {
    setSelectedCell(cell)
    console.log("Cell selected:", cell)
  }, [])

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame)
    console.log("Frame changed:", frame)
  }, [])

  useEffect(() => {
    handleLoadFromHelper();
  }, []);

  const handleLoadFromHelper = async () => {
    try {
      const frames = await getPixelIntensities();

      // Validate and process the 3D array
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
        frameData: frames,
        numRows: numRows,
        numCols: numCols,
        numFrames: numFrames,
      };

      setFrameData(processedData);
      setCurrentFrame(0);

      console.log(`✅ Loaded ${numFrames} frames of ${numRows}x${numCols} heatmaps`);
    } catch (err) {
      console.log(`Error loading data: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <DashboardGrid variant="simple">
      <GridItem area="a">
        {frameData &&
          <HeatmapVisualization
            data={frameData.frameData}
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
