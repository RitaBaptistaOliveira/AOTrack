import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ZoomIn,
  ZoomOut,
  Move,
  MousePointer,
  Info,
  Palette,
  RotateCcw,
  Camera,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
export type BarMode = "pan" | "select" 

interface ControlBarProps {
    mode: BarMode
    onModeChange: (mode: BarMode) => void
    showTooltips: boolean
    showLegend: boolean
    onToggleTooltips: () => void
    onToggleLegend: () => void
    onZoomIn: () => void
    onZoomOut: () => void
    onResetZoom: () => void
    onDownloadPNG: () => void
  }

export default function ControlBar({mode, onModeChange, showTooltips, showLegend, onToggleTooltips, onToggleLegend, onZoomIn, onZoomOut, onResetZoom, onDownloadPNG}: ControlBarProps) {
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

      </div>
    </TooltipProvider>
  )
}