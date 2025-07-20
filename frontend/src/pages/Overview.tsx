import CustomSelect from '@/components/controls/custom-select'
import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { useChartInteraction } from "@/contexts/chart-interactions-context"
import type { IntervalType } from '@/types/visualization'

export default function Overview() {
  const {intervalType, setIntervalType} = useChartInteraction()

  return (
    <DashboardGrid variant="overview">
      <GridItem area="a">
        <CustomSelect value={intervalType} onValueChange={(value) => { setIntervalType(value as IntervalType)}}/>
      </GridItem>
      <GridItem area="b">B</GridItem>
      <GridItem area="c">C</GridItem>
      <GridItem area="d">D</GridItem>
    </DashboardGrid>
  )
}
