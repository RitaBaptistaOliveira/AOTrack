import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "./components/layout/page-layout"
import { routes,  ROUTE_PATHS, dashboardRoutes } from "./routes"
import { AoSessionProvider } from "./contexts/ao-session-context"
import { ChartInteractionProvider } from "./contexts/chart-interactions-context"

export default function App() {
  return (
    <AoSessionProvider>
      <ChartInteractionProvider>
        <Router>
          <Routes>
            <Route path={ROUTE_PATHS.welcome} element={routes.find(r => r.path === ROUTE_PATHS.welcome)?.element}/>
            <Route path="/dashboard/*" element={<Layout />}>
              {dashboardRoutes.map(({ path, element}) => (
                <Route key={path} path={path.replace("/dashboard/", "")} element={element} />
              ))}
            </Route>
          </Routes>
        </Router>
      </ChartInteractionProvider>
    </AoSessionProvider>
  )
}
