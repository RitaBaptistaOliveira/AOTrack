import {
  TableOfContents,
  Blocks,
  DraftingCompass,
  Command
} from "lucide-react"
import Overview from "./pages/Overview"
import Pixels from "./pages/Pixels"
import Measurements from "./pages/Measurements"
import Commands from "./pages/Commands"
import Welcome from "./pages/Welcome"

export const routes = [
  {
    path: "welcome",
    title: "Welcome",
    icon: TableOfContents,
    element: Welcome,
    navVisible: false,
  },
  {
    path: "overview",
    title: "Overview",
    icon: TableOfContents,
    element: Overview,
    navVisible: true,
  },
  {
    path: "pixels",
    title: "Pixels",
    icon: Blocks,
    element: Pixels,
    navVisible: true,
  },
  {
    path: "measurements",
    title: "Measurements",
    icon: DraftingCompass,
    element: Measurements,
    navVisible: true,
  },
  {
    path: "commands",
    title: "Commands",
    icon: Command,
    element: Commands,
    navVisible: true,
  },
]
