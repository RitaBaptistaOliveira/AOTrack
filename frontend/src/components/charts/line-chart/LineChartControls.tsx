import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BarChart3 } from "lucide-react"
import type { MultiDataset } from "../common/utils/types"

interface LineChartControlsProps {
    datasets: MultiDataset
    visibleLines: Record<string, boolean>
    showStats: Record<string, boolean>
    onToggleVisibility: (id: string) => void
    onToggleStats: (id: string) => void
    title?: string
}

export function LineChartControls({ datasets, visibleLines, showStats, onToggleVisibility, onToggleStats, title = "Data Point Evolution" }: LineChartControlsProps) {
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
        </div>
    )
}
