import DashboardGrid, { GridItem } from '@/components/layout/dashboard-grid/dashboard-grid'
import { explorationRoutes } from "@/routes"
import SessionNavButton from '@/components/navigation/session-nav-button'
import MetadataTable from '@/components/charts/metadata-table'
import { useAoSession } from '@/contexts/ao-session-context'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Overview() {

  const { metadataSummary } = useAoSession()
  return (
    <DashboardGrid variant="overview">
      <GridItem area="a">
        <div className="w-full overflow-x-auto">
          <MetadataTable />
        </div>
      </GridItem>
      <GridItem area="b">
        {metadataSummary && (
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Number of Wavefront Sensors</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {metadataSummary.num_wfs}
                </CardTitle>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {metadataSummary.wavefront_sensors.map(wfs => (<>{wfs.uid}</>))} detected
                </div>
              </CardFooter>
            </Card>
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Number of Wavefront Correctors</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {metadataSummary.num_correctors}
                </CardTitle>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {metadataSummary.wavefront_correctors.map(wfc => (<>{wfc.uid}</>))} active
                </div>
              </CardFooter>
            </Card>
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Number of Loops</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {metadataSummary.num_loops}
                </CardTitle>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  <p>{metadataSummary.loops.filter((loop) => loop.closed).length} closed and {metadataSummary.loops.filter((loop) => !loop.closed).length} open loops</p>
                </div>
              </CardFooter>
            </Card>
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Number of Sources</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {metadataSummary.num_sources}
                </CardTitle>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {metadataSummary.sources.map(source => (<>{source.uid}</>))} observed
                </div>
              </CardFooter>
            </Card>
          </div>
        )}
      </GridItem>
      <GridItem area="c">
        <div className="flex flex-row gap-2 w-full h-full">
          {explorationRoutes.map((route) => (
            <SessionNavButton title={route.title} text={route.description} icon={route.icon} route={route.path} />
          ))}
        </div>
      </GridItem>
    </DashboardGrid >
  )
}
