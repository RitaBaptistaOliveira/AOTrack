import type { RefObject } from "react"

interface ChartSVGProps {
  svgRef: RefObject<SVGSVGElement | null>
  containerRef: RefObject<HTMLDivElement | null>
}

export function ChartSVG({ svgRef, containerRef }: ChartSVGProps) {
  return (
    <div ref={containerRef} className="flex-1 min-h-0">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}
