import DashboardGrid from '@/components/dashboard-grid/dashboard-grid'
import { GridItem } from '@/components/dashboard-grid/grid-item'
import { useMediaQuery } from 'react-responsive'

export default function Commands() {
  const isLargeScreen = useMediaQuery({ minWidth: 768 })

  return (
    <DashboardGrid variant="simple">
      <GridItem area="a">A (Left Top)</GridItem>
      <GridItem area="b">D (Right Top)</GridItem>
      <GridItem area="c">E (Right Middle)</GridItem>

      {isLargeScreen ? (
        <GridItem area="de" className="flex gap-4">
          <div className="flex-1">B (Left Bottom Left)</div>
          <div className="flex-1">C (Left Bottom Right)</div>
        </GridItem>
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
