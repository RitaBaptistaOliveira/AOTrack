import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TrendingUp, BarChart3 } from "lucide-react"
import type { MultiDataset } from "../common/utils/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface HistogramControlsProps {
    datasets: MultiDataset
    visibleLines: Record<string, boolean>
    showKDE: Record<string, boolean>
    showStats: Record<string, boolean>
    binCount: number
    binsRange: number[]
    onToggleVisibility: (id: string) => void
    onToggleKDE: (id: string) => void
    onToggleStats: (id: string) => void
    onBinChange: (binCount: number) => void
    title?: string
}

export function HistogramControls({ datasets, visibleLines, showKDE, showStats, binCount, binsRange,
    onToggleVisibility, onToggleKDE, onToggleStats, onBinChange, title = "Distribution" }: HistogramControlsProps) {
    return (
        <div className="mb-4 flex-shrink-0 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <TooltipProvider>
                <div className="flex gap-2 items-center">
                    {datasets.map((ds) => {
                        const isVisible = visibleLines[ds.pointId] ?? true
                        return (
                            <div key={ds.pointId} className="flex items-center">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={`flex items-center gap-1 h-7 px-2 py-0 text-xs rounded-r-none border-r-0 ${!isVisible ? "opacity-50" : ""}`}
                                            onClick={() => onToggleVisibility(String(ds.pointId))}
                                        >
                                            {ds.dimId} <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isVisible ? ds.color : "#d1d5db" }} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Toggle visibility for {ds.pointId}-{ds.dimId}</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={() => onToggleKDE(String(ds.pointId))} className={`h-7 p-0 rounded-none ${!isVisible ? "opacity-50 cursor-not-allowed" : showKDE[ds.pointId] ? "bg-gray-100" : ""}`}>
                                            <TrendingUp size={12} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Toggle KDE curve</p>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={() => onToggleStats(String(ds.pointId))} className={`h-7 p-0 rounded-l-none ${!isVisible ? "opacity-50 cursor-not-allowed" : showStats[ds.pointId] ? "bg-gray-100" : ""}`}>
                                            <BarChart3 size={12} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Toggle Stats</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        )
                    })}
                </div>
            </TooltipProvider >
            <div className="flex items-center gap-1 pl-2">
                <span className="text-sm font-medium">Bins:</span>
                <Select value={binCount.toString()} onValueChange={(val) => onBinChange(Number(val))}>
                    <SelectTrigger className="h-7 w-auto text-xs text-center px-1">
                        <SelectValue placeholder={binCount.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                        {binsRange.map((bin) => (
                            <SelectItem key={bin} value={bin.toString()}>
                                {bin}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
