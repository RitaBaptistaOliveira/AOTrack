interface HeatmapLegendProps {
  minValue: number,
  maxValue: number,
  gradientStops: { offset: string; color: string }[]
}

export default function HeatmapLegend({ minValue, maxValue, gradientStops }: HeatmapLegendProps) {
  return (
    <div className="absolute top-0 right-0 bg-white border-1 border-gray-300 p-1 gap-1 h-full flex flex-col items-center text-xs justify-between">
      <div>{maxValue.toPrecision(2)}</div>
      <svg className="w-4 h-full">
        <defs>
          <linearGradient id="legend-gradient" x1="0" y1="1" x2="0" y2="0">
            {gradientStops.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
        <rect fill="url(#legend-gradient)" rx="5" className="w-full h-full" />
      </svg>
      <div>{minValue.toPrecision(2)}</div>
    </div>
  )
}
