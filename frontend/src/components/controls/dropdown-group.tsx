import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useChartInteraction } from "@/contexts/chart-interactions-context"
import type { ColorMap, IntervalType, ScaleType } from "@/types/visualization"
import CustomSelect from "./custom-select"
import type { ReactElement } from "react"

/**
 * Props for the {@link SelectWithTooltip} component.
 *
 * @typeParam T A string literal type representing the value type of the select. In this case, it can be any of the types defined in `ColorMap`, `ScaleType`, or `IntervalType`.
*/
interface SelectProps<T extends string> {
  /** The currently selected value. */
  value: T

  /**
   * Callback triggered when a new value is selected.
   * @param value The newly selected value.
   */
  onChange: (value: T) => void

  /** Tooltip text describing the select's purpose. */
  tooltip: string

  /** The list of selectable options with labels and values. */
  options: { label: string; value: T }[]

  /** Optional CSS class for styling the select trigger. */
  className?: string
}

/**
 * Renders a generic select component with an integrated tooltip.
 *
 * @typeParam T A string literal type representing the value type of the select. In this case, it can be any of the types defined in `ColorMap`, `ScaleType`, or `IntervalType`.
 *
 * @param props The props for configuring the select defined in {@link SelectProps}.
 * 
 * @category Component
 */
function SelectWithTooltip<T extends string>({ value, onChange, tooltip, options, className }: SelectProps<T>): ReactElement {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Select value={value} onValueChange={(val) => onChange(val as T)}>
            <SelectTrigger className={className}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Renders a group of dropdowns for controlling visualization parameters.
 *
 * This component allows the user to:
 * - Change the scale type
 * - Change the interval type
 * - Change the color map
 *
 * @category Component
 */
export default function DropdownGroup(): ReactElement {
  const { colorMap, setColorMap, intervalType, setIntervalType, scaleType, setScaleType } = useChartInteraction()

  /** Available scale type options. */
  const scaleOptions: { label: string, value: ScaleType }[] = [
    { label: "Linear", value: "linear" },
    { label: "Log", value: "log" },
    { label: "Square Root", value: "sqrt" },
    { label: "Squared", value: "squared" },
    { label: "ASINH", value: "asinh" },
    { label: "Sinh", value: "sinh" },
    // { label: "Hist Eq.", value: "histequal" },
    { label: "Log Exp", value: "logexp" },
  ]

  /** Available color map options. */
  const colorMapOptions: { label: string, value: ColorMap }[] = [
    { label: "Viridis", value: "viridis" },
    { label: "Inferno", value: "inferno" },
    { label: "Greys", value: "greys" },
    { label: "Blues", value: "blues" },
    { label: "Reds", value: "reds" },
    { label: "Greens", value: "greens" },
    { label: "Rainbow", value: "rainbow" },
  ]

  return (
    <div className="flex items-center gap-2">
      <SelectWithTooltip
        value={scaleType}
        onChange={setScaleType}
        tooltip="Change the scale type"
        options={scaleOptions}
        className="h-8 text-xs w-32"
      />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <CustomSelect value={intervalType} onValueChange={(value) => { setIntervalType(value as IntervalType) }} />
          </TooltipTrigger>
          <TooltipContent>Change the interval</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SelectWithTooltip
        value={colorMap}
        onChange={setColorMap}
        tooltip="Change the color map"
        options={colorMapOptions}
        className="h-8 text-xs w-32"
      />
    </div>
  )
}
