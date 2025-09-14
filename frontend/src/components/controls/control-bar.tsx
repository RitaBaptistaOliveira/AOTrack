import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ZoomIn, ZoomOut, Move, MousePointer, Info, Palette, RotateCcw, Camera } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ReactElement } from "react"

/** Available interaction modes for the control bar. */
export type BarMode = "pan" | "select"

/** Props type for {@link ControlBar}. */
interface ControlBarProps {
  /** Current interaction mode ("pan" or "select"). */
  mode: BarMode

  /** Callback to change the current interaction mode. */
  onModeChange: (mode: BarMode) => void

  /** A boolean indicating if the tooltips should being shown. */
  showTooltips: boolean

  /** A boolean indicating if the legend should being shown.*/
  showLegend: boolean

  /** Callback to toggle tooltip visibility. */
  onToggleTooltips: () => void

  /** Callback to toggle legend visibility. */
  onToggleLegend: () => void

  /** Callback to zoom in on the visualization. */
  onZoomIn: () => void

  /** Callback to zoom out of the visualization. */
  onZoomOut: () => void

  /** Callback to reset zoom to default. */
  onResetZoom: () => void

  /** Callback to download the current visualization as a PNG image. */
  onDownloadPNG: () => void
}

/**
 * A control item definition for {@link ControlBar}. Represents a single button with an icon, tooltip, and click handler.
 */
interface ControlItem {
  /** Icon component from Lucide. */
  icon: LucideIcon

  /** Tooltip text describing the control action. */
  tooltip: string

  /** Click handler for the control button. */
  onClick: () => void

  /** 
   * A boolean indicating if the button is in an active/selected state.
   * Not all buttons have these state. e.g. download button does not have an active state.
   */
  active?: boolean
}

/**
 * Renders a single button within the control bar with a tooltip.
 *
 * @param props The props for configuring the control item defined in {@link ControlItem}.
 * @category Component
 */
function ControlButton({ icon: Icon, tooltip, active, onClick }: ControlItem): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "active" : "ghost"}
          size="icon"
          onClick={onClick}
          aria-label={tooltip}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Renders a bar for interacting and controlling a canvas.
 *
 * The bar includes:
 * - **Download**: Export the visualization as PNG.
 * - **Zoom**: Zoom in, zoom out, reset zoom.
 * - **Interaction Modes**: Pan or select.
 * - **Display Options**: Toggle tooltips and legend.
 *
 * All controls are grouped with separators and display tooltips.
 *
 * ```tsx
 * <ControlBar
 *   mode="pan"
 *   onModeChange={setMode}
 *   showTooltips={true}
 *   showLegend={false}
 *   onToggleTooltips={() => {}}
 *   onToggleLegend={() => {}}
 *   onZoomIn={() => {}}
 *   onZoomOut={() => {}}
 *   onResetZoom={() => {}}
 *   onDownloadPNG={() => {}}
 * />
 * ```
 * 
 * @param props The props for configuring the control bar defined in {@link ControlBarProps}.
 * 
 * @category Component
 */
export default function ControlBar({ mode, onModeChange, showTooltips, showLegend, onToggleTooltips, onToggleLegend, onZoomIn, onZoomOut, onResetZoom, onDownloadPNG }: ControlBarProps): ReactElement {

  /** Static definition of control groups and their buttons. */
  const groups: ControlItem[][] = [

    [
      { icon: Camera, tooltip: "Download as PNG", onClick: onDownloadPNG }
    ],

    [
      { icon: ZoomIn, tooltip: "Zoom in", onClick: onZoomIn },
      { icon: ZoomOut, tooltip: "Zoom out", onClick: onZoomOut },
      { icon: RotateCcw, tooltip: "Reset zoom", onClick: onResetZoom }
    ],

    [
      { icon: Move, tooltip: "Pan", onClick: () => onModeChange("pan"), active: mode === "pan" },
      { icon: MousePointer, tooltip: "Select", onClick: () => onModeChange("select"), active: mode === "select" }
    ],

    [
      { icon: Info, tooltip: "Toggle tooltips", onClick: onToggleTooltips, active: showTooltips },
      { icon: Palette, tooltip: "Toggle legend", onClick: onToggleLegend, active: showLegend }
    ]
  ]

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 py-2 bg-white">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="flex items-center gap-1">
            {group.map((item, index) => (<ControlButton key={index} {...item} />))}
            {groupIndex < groups.length - 1 && <Separator orientation="vertical" className="h-6" />}
          </div>
        ))}
      </div>
    </TooltipProvider>
  )
}