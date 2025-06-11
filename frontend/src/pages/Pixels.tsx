import HeatmapChart from '@/components/charts/heatmap-chart'
import TestCanvasChart from '@/components/charts/test'
import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { ChartInteractionProvider } from '@/contexts/chart-interactions-context'
import { useMediaQuery } from 'react-responsive'
import { useAoHelper } from '@/hooks/use-ao-helper'

export default function Pixels() {
  const isLargeScreen = useMediaQuery({ minWidth: 768 })

  const array3x3x3: number[][][] = [
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ],
    [
      [10, 11, 12],
      [13, 14, 15],
      [16, 17, 18]
    ],
    [
      [19, 20, 21],
      [22, 23, 24],
      [25, 26, 27]
    ]
  ];
  return (
    <ChartInteractionProvider>
      <DashboardGrid variant="simple">
        <GridItem area="a"><HeatmapChart frames={array3x3x3} numRows={3} numCols={3} numFrames={3}></HeatmapChart></GridItem>
        <GridItem area="b"><TestCanvasChart /></GridItem>
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
    </ChartInteractionProvider>
  )
}
