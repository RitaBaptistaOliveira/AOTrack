import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { ChartInteractionProvider } from '@/contexts/chart-interactions-context'
import { useMediaQuery } from 'react-responsive'

export default function Pixels() {
  const isLargeScreen = useMediaQuery({ minWidth: 768 })

  return (
    <ChartInteractionProvider>
      <DashboardGrid variant="simple">
        <GridItem area="a">A (Left Top)</GridItem>
        <GridItem area="b">D (Right Top)</GridItem>
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
