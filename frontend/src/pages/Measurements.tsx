import { Card, CardContent } from '@/components/ui/card'
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
export default function Measurements() {
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
      console.error(`Error updating data: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };
  return (
    <div className="grid grid-cols-6 grid-rows-3 gap-2 p-2 h-screen">
      {/* A - spans 3 cols, 2 rows */}
      <Card className="col-span-3 row-span-2">
        <CardContent className="h-full flex items-center justify-center">
          {/* {frameData &&
            <Visualization
              data={frameData.data}
              numRows={frameData.numRows}
              numCols={frameData.numCols}
              numFrames={frameData.numFrames}
              onCellSelect={handleCellSelect}
              onFrameChange={handleFrameChange}
            />} */}
        </CardContent>
      </Card>

      {/* B - spans 3 cols, 2 rows */}
      <Card className="col-span-3 row-span-2">
        <CardContent className="h-full flex items-center justify-center">B</CardContent>
      </Card>

      {/* C */}
      <Card className="col-span-2 row-span-1">
        <CardContent className="h-full flex items-center justify-center">C</CardContent>
      </Card>

      {/* D */}
      <Card className="col-span-2 row-span-1">
        <CardContent className="h-full flex items-center justify-center">D</CardContent>
      </Card>

      {/* E */}
      <Card className="col-span-2 row-span-1">
        <CardContent className="h-full flex items-center justify-center">E</CardContent>
      </Card>
    </div>
  )
}
