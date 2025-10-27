import { useMemo, useRef, useState } from "react"
import type { MultiDataset } from "../common/utils/types"
import { ChartSVG } from "../common/ChartSVG"
import { useLineChartRenderer } from "./hooks/useLineChartRender"
import { LineChartControls } from "./LineChartControls"

interface ChartProps {
    datasets: MultiDataset
    labels?: {
        title?: string
        x?: string
        y?: string
    }
}

export default function LineChart({ datasets, labels }: ChartProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    const initialVisibility = useMemo(
        () => Object.fromEntries(datasets.map(d => [d.pointId.toString(), true])),
        [datasets]
    )
    const initialStats = useMemo(
        () => Object.fromEntries(datasets.map(d => [d.pointId.toString(), false])),
        [datasets]
    )

    const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>(initialVisibility)
    const [showStats, setShowStats] = useState<Record<string, boolean>>(initialStats)
    useLineChartRenderer({
        svgRef,
        containerRef,
        datasets,
        visibleLines,
        showStats,
        xLabel: labels?.x,
        yLabel: labels?.y
    })

    return (
        <div className="w-full h-full flex flex-col">
            <LineChartControls
                datasets={datasets}
                visibleLines={visibleLines}
                showStats={showStats}
                onToggleVisibility={(id) => setVisibleLines(prev => ({ ...prev, [id]: !prev[id] }))}
                onToggleStats={(id) => setShowStats(prev => ({ ...prev, [id]: !prev[id] }))}
                title={labels?.title}
            />
            <ChartSVG svgRef={svgRef} containerRef={containerRef} />
        </div>
    )
}
