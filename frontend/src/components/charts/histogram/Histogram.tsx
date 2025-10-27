import { useMemo, useRef, useState } from "react"
import type { MultiDataset } from "../common/utils/types"
import { useBinsRanges } from "./hooks/useBinsRange"
import { useHistogramRenderer } from "./hooks/useHistogramRenderer"
import { HistogramControls } from "./HistogramControls"
import { ChartSVG } from "../common/ChartSVG"

interface HistogramProps {
  datasets: MultiDataset
  labels?: {
    title?: string
    x?: string
    y?: string
  }
}

export default function Histogram({ datasets, labels }: HistogramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const initialVisibility = useMemo(
    () => Object.fromEntries(datasets.map(d => [d.pointId.toString(), true])),
    [datasets]
  )
  const initialKDE = useMemo(
    () => Object.fromEntries(datasets.map(d => [d.pointId.toString(), false])),
    [datasets]
  )
  const initialStats = useMemo(
    () => Object.fromEntries(datasets.map(d => [d.pointId.toString(), false])),
    [datasets]
  )

  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>(initialVisibility)
  const [showKDE, setShowKDE] = useState<Record<string, boolean>>(initialKDE)
  const [showStats, setShowStats] = useState<Record<string, boolean>>(initialStats)
  

  const {binsRanges, binCount, setBinCount} = useBinsRanges(datasets)

  useHistogramRenderer({
    svgRef,
    containerRef,
    datasets,
    visibleLines,
    showKDE,
    showStats,
    binCount: binCount ?? 10,
    margin: { top: 5, right: 10, bottom: 40, left: 40 },
    xLabel: labels?.x,
    yLabel: labels?.y,
  })

  return (
    <div className="w-full h-full flex flex-col">
      <HistogramControls
        datasets={datasets}
        visibleLines={visibleLines}
        showKDE={showKDE}
        showStats={showStats}
        binCount={binCount ?? 10}
        binsRange={binsRanges}
        onToggleVisibility={(id) =>setVisibleLines(prev => ({ ...prev, [id]: !prev[id] }))}
        onToggleKDE={(id) => setShowKDE(prev => ({ ...prev, [id]: !prev[id] }))}
        onToggleStats={(id) => setShowStats(prev => ({ ...prev, [id]: !prev[id] }))}
        onBinChange={setBinCount}
        title={labels?.title}
      />
      <ChartSVG svgRef={svgRef} containerRef={containerRef} />
    </div>
  )
}
