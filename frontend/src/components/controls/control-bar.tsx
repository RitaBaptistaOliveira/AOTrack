import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ZoomIn,
  ZoomOut,
  Move,
  MousePointer,
  Grid3X3,
  Info,
  Palette,
  RotateCcw,
  Camera,
  FileText,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export type BarMode = "pan" | "select" 

interface ControlBarProps {
  interaction: {
    mode: BarMode
    onModeChange: (mode: BarMode) => void
  }
  display: {
    showGrid: boolean
    showTooltips: boolean
    showLegend: boolean
    onToggleGrid: () => void
    onToggleTooltips: () => void
    onToggleLegend: () => void
  }
  zoom: {
    onZoomIn: () => void
    onZoomOut: () => void
    onResetZoom: () => void
  }
  utility: {
    onDownloadPNG: () => void
    onReset: () => void
  }
}

export default function ControlBar({interaction, display, zoom, utility}: ControlBarProps) {

  const { mode, onModeChange } = interaction
  const { showGrid, showTooltips, showLegend, onToggleGrid, onToggleTooltips, onToggleLegend } = display
  const { onZoomIn, onZoomOut, onResetZoom } = zoom
  const { onDownloadPNG, onReset } = utility

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 py-2 bg-white">
        {/* Download Tools */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={onDownloadPNG}>
                <Camera className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download as PNG</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={onZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={onZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={onResetZoom}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset zoom</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Interaction Modes */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={mode === "pan" ? "active" : "ghost"}
                onClick={() => onModeChange("pan")}
              >
                <Move className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pan</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={mode === "select" ? "active" : "ghost"}
                onClick={() => onModeChange("select")}
              >
                <MousePointer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Select</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Display Options */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={showGrid ? "active" : "ghost"} onClick={onToggleGrid}>
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle grid</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showTooltips ? "active" : "ghost"}
                onClick={onToggleTooltips}
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle tooltips</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={showLegend ? "active" : "ghost"} onClick={onToggleLegend}>
                <Palette className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle legend</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Reset */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" onClick={onReset}>
              <FileText className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset all</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}