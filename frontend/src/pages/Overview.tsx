import DashboardGrid, { GridItem } from '@/components/dashboard-grid/dashboard-grid'

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
