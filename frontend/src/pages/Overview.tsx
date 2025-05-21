import DashboardGrid from '@/components/dashboard-grid/dashboard-grid'
import { GridItem } from '@/components/dashboard-grid/grid-item'

export default function Overview() {

  return (
    <DashboardGrid variant="overview">
      <GridItem area="a">A</GridItem>
      <GridItem area="b">B</GridItem>
      <GridItem area="c">C</GridItem>
      <GridItem area="d">D</GridItem>
    </DashboardGrid>
  )
}
