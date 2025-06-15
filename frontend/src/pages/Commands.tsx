import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useMediaQuery } from 'react-responsive'

export default function Commands() {
  const isLargeScreen = useMediaQuery({ minWidth: 768 })

  return (
    <DashboardGrid variant="default">
      <GridItem area="a">Top Left Box (A)</GridItem>
      <GridItem area="b">Top Right Box (B)</GridItem>
      <GridItem area="c">Bottom Left (C)</GridItem>
      <GridItem area="d">Bottom Middle (D)</GridItem>
      <GridItem area="e">Bottom Right (E)</GridItem>
    </DashboardGrid>
  )
}
