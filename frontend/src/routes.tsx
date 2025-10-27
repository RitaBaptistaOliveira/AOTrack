import {
  TableOfContents,
  Blocks,
  DraftingCompass,
  Command,
  type LucideIcon
} from "lucide-react"
import { lazy, Suspense, type JSX, type ReactElement } from "react"

export const ROUTE_PATHS = {
  welcome: "/welcome",
  overview: "/dashboard/overview",
  pixels: "/dashboard/pixels",
  measurements: "/dashboard/measurements",
  commands: "/dashboard/commands",
}

const Welcome = lazy(() => import("@/pages/Welcome"))
const Overview = lazy(() => import("@/pages/Overview"))
const Pixels = lazy(() => import("@/pages/Pixels"))
const Measurements = lazy(() => import("@/pages/Measurements"))
const Commands = lazy(() => import("@/pages/Commands"))

const withSuspense = (Component: React.LazyExoticComponent<() => JSX.Element>): ReactElement => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center h-full p-8 text-gray-500 animate-pulse">
        Loading...
      </div>
    }
  >
    <Component />
  </Suspense>
)

export interface AppRoute {
  path: string
  title: string
  description: string
  icon: LucideIcon
  element: ReactElement
  navVisible: boolean
}

export const coreRoutes: AppRoute[] = [
  {
    path: ROUTE_PATHS.welcome,
    title: "Welcome",
    description: "Welcome Page",
    icon: TableOfContents,
    element: withSuspense(Welcome),
    navVisible: false,
  }
]

export const overviewRoutes: AppRoute[] = [
  {
    path: ROUTE_PATHS.overview,
    title: "Overview",
    description: "Session Overview",
    icon: TableOfContents,
    element: withSuspense(Overview),
    navVisible: true,
  },
  // Add more core routes here if needed (like Settings, Profile, etc.)
]

export const explorationRoutes: AppRoute[] = [
  {
    path: ROUTE_PATHS.pixels,
    title: "Pixels",
    description: "Inspect raw pixel-level data from the wavefront sensors or science cameras, including intensity maps and temporal evolution.",
    icon: Blocks,
    element: withSuspense(Pixels),
    navVisible: true,
  },
  {
    path: ROUTE_PATHS.measurements,
    title: "Measurements", 
    description: "Analyze processed measurements derived from sensor data, such as slopes, centroids, or reconstructed wavefront statistics.",
    icon: DraftingCompass,
    element: withSuspense(Measurements),
    navVisible: true,
  },
  {
    path: ROUTE_PATHS.commands,
    title: "Commands",
    description: "Visualize and assess the commands sent to deformable mirrors or other actuators, including amplitude, frequency, and stability.",
    icon: Command,
    element: withSuspense(Commands),
    navVisible: true,
  },
]

export const routes: AppRoute[] = [...coreRoutes, ...overviewRoutes, ...explorationRoutes]
export const navRoutes = routes.filter((r) => r.navVisible)
export const dashboardRoutes = routes.filter((r) => r.path.startsWith("/dashboard"))
