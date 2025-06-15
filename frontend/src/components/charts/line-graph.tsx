import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface DataPoint {
  x: number
  y: number
}

interface LineChartProps {
  data: DataPoint[]
}

export default function LineChart({ data }: LineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ width, height })
      }
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    const margin = { top: 20, right: 20, bottom: 30, left: 40 }
    const innerWidth = size.width - margin.left - margin.right
    const innerHeight = size.height - margin.top - margin.bottom

    const minY = d3.min(data, d => d.y)!
    const maxY = d3.max(data, d => d.y)!
    const avgY = d3.mean(data, d => d.y)!

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    svg
      .append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.x) as [number, number])
      .range([0, innerWidth])

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.y)!])
      .nice()
      .range([innerHeight, 0])

    const xAxis = d3.axisBottom(xScale)
    const yAxis = d3.axisLeft(yScale)

    const line = d3
      .line<DataPoint>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
    g.append("g")
      .attr("transform", `translate(${innerWidth - 80}, 0)`)
      .call((legend) => {
        legend
          .append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", "steelblue")

        legend
          .append("text")
          .attr("x", 18)
          .attr("y", 10)
          .attr("font-size", "12px")
          .attr("fill", "#333")
          .text("Value")
      })

    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)

    const yAxisG = g.append("g").call(yAxis)

    const chartContent = g.append("g").attr("clip-path", "url(#clip)")


    const minLine = chartContent
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("stroke", "green")
      .attr("stroke-dasharray", "4 2")

    const maxLine = chartContent
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("stroke", "red")
      .attr("stroke-dasharray", "4 2")

    const avgLine = chartContent
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("stroke", "orange")
      .attr("stroke-dasharray", "4 2")

    const path = chartContent
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line)

    const focusCircle = chartContent
      .append("circle")
      .attr("r", 4)
      .attr("fill", "red")
      .style("display", "none")

    const overlay = chartContent
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .on("mousemove", function (event) {
        const [mouseX] = d3.pointer(event)
        const x0 = xScale.invert(mouseX)
        const bisect = d3.bisector((d: DataPoint) => d.x).left
        const idx = bisect(data, x0)
        const d0 = data[Math.max(0, Math.min(idx, data.length - 1))]

        if (!d0) return

        const cx = xScale(d0.x)
        const cy = yScale(d0.y)

        focusCircle
          .attr("cx", cx)
          .attr("cy", cy)
          .style("display", "block")

        const tooltip = tooltipRef.current
        if (tooltip) {
          tooltip.style.display = "block"
          tooltip.style.left = `${margin.left + cx + 10}px`
          tooltip.style.top = `${margin.top + cy - 20}px`
          tooltip.innerHTML = `x: ${d0.x}<br/>y: ${d0.y}`
        }
      })
      .on("mouseleave", () => {
        focusCircle.style("display", "none")
        if (tooltipRef.current) tooltipRef.current.style.display = "none"
      })

    // --- Zoom Behavior ---
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .translateExtent([[0, 0], [size.width, size.height]])
      .extent([[0, 0], [size.width, size.height]])
      .on("zoom", (event) => {
        focusCircle.style("display", "none")
        if (tooltipRef.current) {
          tooltipRef.current.style.display = "none"
        }
        const transform = event.transform

        const zx = transform.rescaleX(xScale)
        const zy = transform.rescaleY(yScale)

        xAxisG.call(d3.axisBottom(zx))
        yAxisG.call(d3.axisLeft(zy))

        path.attr("d", line.x((d) => zx(d.x)).y((d) => zy(d.y)))
        minLine
          .attr("y1", zy(minY))
          .attr("y2", zy(minY))

        maxLine
          .attr("y1", zy(maxY))
          .attr("y2", zy(maxY))

        avgLine
          .attr("y1", zy(avgY))
          .attr("y2", zy(avgY))

        overlay.on("mousemove", function (event) {
          const [mouseX] = d3.pointer(event)
          const x0 = zx.invert(mouseX)
          const bisect = d3.bisector((d: DataPoint) => d.x).left
          const idx = bisect(data, x0)
          const d0 = data[Math.max(0, Math.min(idx, data.length - 1))]

          if (!d0) return

          const cx = zx(d0.x)
          const cy = zy(d0.y)

          focusCircle
            .attr("cx", cx)
            .attr("cy", cy)
            .style("display", "block")

          const tooltip = tooltipRef.current
          if (tooltip) {
            tooltip.style.display = "block"
            tooltip.style.left = `${margin.left + cx + 10}px`
            tooltip.style.top = `${margin.top + cy - 20}px`
            tooltip.innerHTML = `x: ${d0.x}<br/>y: ${d0.y}`
          }
        })
      })

    svg.call(zoom).call(zoom.transform, d3.zoomIdentity)

  }, [data, size])

  return (
    <div ref={containerRef} className="relative h-full w-full flex">
      <svg ref={svgRef} width={size.width} height={size.height} />
      <div
        // ref={tooltipRef}
        className="absolute text-xs bg-white shadow px-2 py-1 rounded border pointer-events-none"
        style={{ display: "none", position: "absolute", zIndex: 10 }}
      />
    </div>
  )
}
