import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useChartInteraction } from "@/contexts/chart-interactions-context"

export default function DropdownGroup() {

    const {colorMap, setColorMap, scaleType, setScaleType, intervalType, setIntervalType } = useChartInteraction()
    return (
        <div className="flex items-center gap-2">

            <Select value={scaleType} onValueChange={setScaleType}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <SelectTrigger className="h-8 text-xs w-24">
                                <SelectValue placeholder="Scale" />
                            </SelectTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Scale transformation</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <SelectContent>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="log">Log</SelectItem>
                    <SelectItem value="sqrt">Square Root</SelectItem>
                    <SelectItem value="pow">Power</SelectItem>
                    <SelectItem value="squared">Squared</SelectItem>
                    <SelectItem value="asinh">ASINH</SelectItem>
                    <SelectItem value="sinh">Sinh</SelectItem>
                    <SelectItem value="histequal">Histogram Equalization</SelectItem>
                    <SelectItem value="logexp">Log Exponential</SelectItem>
                </SelectContent>
            </Select>

            <Select value={intervalType} onValueChange={setIntervalType}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <SelectTrigger className="h-8 text-xs w-24">
                                <SelectValue placeholder="Interval" />
                            </SelectTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Interval type</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <SelectContent>
                    <SelectItem value="minmax">MinMax</SelectItem>
                    <SelectItem value="zscale">Z-Scale</SelectItem>
                    <SelectItem value="percentile">Percentile</SelectItem>
                </SelectContent>
            </Select>

            <Select value={colorMap} onValueChange={setColorMap}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <SelectTrigger className="h-8 text-xs w-24">
                                <SelectValue placeholder="Color" />
                            </SelectTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Colormap</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <SelectContent>
                    <SelectItem value="viridis">Viridis</SelectItem>
                    <SelectItem value="inferno">Inferno</SelectItem>
                    <SelectItem value="greys">Greys</SelectItem>
                    <SelectItem value="blues">Blues</SelectItem>
                    <SelectItem value="reds">Reds</SelectItem>
                    <SelectItem value="greens">Greens</SelectItem>
                    <SelectItem value="rainbow">Rainbow</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}