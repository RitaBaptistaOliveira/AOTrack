import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "./Layout"
import { routes } from "./routes"
import Welcome from "./pages/Welcome"

export default function App() {
  return (
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
  )
}
