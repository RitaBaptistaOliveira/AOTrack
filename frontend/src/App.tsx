import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "./components/layout/page-layout"
import { routes } from "./routes"
import Welcome from "./pages/Welcome"
import { AoSessionProvider } from "./contexts/ao-session-context"
import { ChartInteractionProvider } from "./contexts/chart-interactions-context"

export default function App() {
  return (
    <AoSessionProvider>
      <ChartInteractionProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Welcome />}></Route>
            <Route path="/dashboard" element={<Layout />}>
              {routes.map(({ path, element: Element }) => (
                <Route key={path} path={path} element={<Element />} />
              ))}
            </Route>
          </Routes>
        </Router>
      </ChartInteractionProvider>
    </AoSessionProvider>
  )
}
