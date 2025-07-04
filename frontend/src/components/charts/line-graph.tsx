import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { createPortal } from "react-dom"
import type { DataPoint } from "@/types/visualization"

interface LineChartProps {
  data: DataPoint[]
  selectedPoint?: DataPoint[]
}

export default function LineChart({ data, selectedPoint }: LineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const xScaleRef = useRef<d3.ScaleLinear<number, number, never> | null>(null)
  const yScaleRef = useRef<d3.ScaleLinear<number, number, never> | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hoverInfo, setHoverInfo] = useState<null | {
    value: any
    x: number
    y: number
  }>(null)

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
    console.log("LINE DRAW")
    if (!svgRef.current || !data.length || size.width === 0 || size.height === 0) return

    const margin = { top: 20, right: 20, bottom: 20, left: 40 }
    const width = size.width - margin.left - margin.right
    const height = size.height - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    svg.append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height)

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)
    const chartContent = g.append("g").attr("clip-path", "url(#clip)")

    const intensitiesDefault = data.map((d) => d.y)
    const intensitiesPoint = selectedPoint?.map((d) => d.y)

    const allY = [...intensitiesDefault, ...(intensitiesPoint ?? [])]
    const [minX, maxX] = d3.extent(data, (d) => d.x) as [number, number]

    const yMax = d3.max(allY.flat())!

    const xScale = d3.scaleLinear().domain([minX + 1, maxX + 1]).range([0, width])
    const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0])
    xScaleRef.current = xScale
    yScaleRef.current = yScale
    const xAxis = svg.append("g").attr("transform", `translate(${margin.left},${height + margin.top})`).attr("class", "x-axis").call(d3.axisBottom(xScale))
    const yAxis = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`).attr("class", "y-axis").call(d3.axisLeft(yScale))
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", margin.left + width / 2)
      .attr("y", height + margin.top + 35)
      .text("Frames")
      .style("font-size", "16px");

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `rotate(-90)`)
      .attr("x", -(margin.top + height / 2))
      .attr("y", margin.left - 30)
      .text("Intensity (AUD)")
      .style("font-size", "16px");

    const line = d3.line<DataPoint>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))

    // chartContent.append("path")
    //   .datum(data)
    //   .attr("class", `main-line`)
    //   .attr("fill", "none")
    //   .attr("stroke", "steelblue")
    //   .attr("stroke-width", 2)
    //   .attr("d", line)
    //   .on("mousemove", function (event) {
    //     const [mx] = d3.pointer(event)
    //     if (!xScaleRef.current) return;
    //     const zx = xScaleRef.current.invert(mx)

    //     const closest = data.reduce((a, b) =>
    //       Math.abs(a.x - zx) < Math.abs(b.x - zx) ? a : b
    //     )
    //     setHoverInfo({
    //       value: closest,
    //       x: event.clientX,
    //       y: event.clientY,
    //     })
    //   })
    //   .on("mouseleave", () => setHoverInfo(null))

    // const min = d3.min(data, d => d.y)!
    // const max = d3.max(data, d => d.y)!
    // const mean = d3.mean(data, d => d.y)!

    // chartContent.append("line")
    //   .datum(min)
    //   .attr("class", `stat-line`)
    //   .attr("x1", 0)
    //   .attr("x2", width)
    //   .attr("y1", yScale(min))
    //   .attr("y2", yScale(min))
    //   .attr("stroke", "steelblue")
    //   .attr("stroke-dasharray", "4 2")
    //   .on("mousemove", function (event) {
    //     const [mx] = d3.pointer(event)
    //     if (!xScaleRef.current) return;
    //     const frame = Math.round(xScaleRef.current.invert(mx))

    //     if (frame < 0 || frame >= data.length) return

    //     const closest = {
    //       x: frame,
    //       y: min,
    //     }
    //     setHoverInfo({
    //       value: closest,
    //       x: event.clientX,
    //       y: event.clientY,
    //     })
    //   })
    //   .on("mouseleave", () => setHoverInfo(null))

    // chartContent.append("line")
    //   .datum(max)
    //   .attr("class", `stat-line`)
    //   .attr("x1", 0)
    //   .attr("x2", width)
    //   .attr("y1", yScale(max))
    //   .attr("y2", yScale(max))
    //   .attr("stroke", "steelblue")
    //   .attr("stroke-dasharray", "4 2")
    //   .on("mousemove", function (event) {
    //     const [mx] = d3.pointer(event)
    //     if (!xScaleRef.current) return;
    //     const frame = Math.round(xScaleRef.current.invert(mx))

    //     if (frame < 0 || frame >= data.length) return

    //     const closest = {
    //       x: frame,
    //       y: max,
    //     }
    //     setHoverInfo({
    //       value: closest,
    //       x: event.clientX,
    //       y: event.clientY,
    //     })
    //   })
    //   .on("mouseleave", () => setHoverInfo(null))

    // chartContent.append("line")
    //   .datum(mean)
    //   .attr("class", `stat-line`)
    //   .attr("x1", 0)
    //   .attr("x2", width)
    //   .attr("y1", yScale(mean))
    //   .attr("y2", yScale(mean))
    //   .attr("stroke", "steelblue")
    //   .attr("stroke-dasharray", "4 2")
    //   .on("mousemove", function (event) {
    //     const [mx] = d3.pointer(event)
    //     if (!xScaleRef.current) return;
    //     const frame = Math.round(xScaleRef.current.invert(mx))

    //     if (frame < 0 || frame >= data.length) return

    //     const closest = {
    //       x: frame,
    //       y: mean,
    //     }
    //     setHoverInfo({
    //       value: closest,
    //       x: event.clientX,
    //       y: event.clientY,
    //     })
    //   })
    //   .on("mouseleave", () => setHoverInfo(null))

    if (selectedPoint?.length) {
      chartContent.append("path")
        .datum(selectedPoint)
        .attr("class", `main-line`)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", line)
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event)
          if (!xScaleRef.current) return;
          const zx = xScaleRef.current.invert(mx)

          const closest = selectedPoint.reduce((a, b) =>
            Math.abs(a.x - zx) < Math.abs(b.x - zx) ? a : b
          )
          setHoverInfo({
            value: { x: closest.x + 1, y: closest },
            x: event.clientX,
            y: event.clientY,
          })
        })
        .on("mouseleave", () => setHoverInfo(null))

      const minSelected = d3.min(selectedPoint, d => d.y)!
      const maxSelected = d3.max(selectedPoint, d => d.y)!
      const meanSelected = d3.mean(selectedPoint, d => d.y)!

      chartContent.append("line")
        .datum(minSelected)
        .attr("class", `stat-line`)
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(minSelected))
        .attr("y2", yScale(minSelected))
        .attr("stroke", "green")
        .attr("stroke-dasharray", "4 2")
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event)
          if (!xScaleRef.current) return;
          const frame = Math.round(xScaleRef.current.invert(mx))

          if (frame < 0 || frame >= data.length) return

          const closest = {
            x: frame,
            y: minSelected,
          }
          setHoverInfo({
            value: closest,
            x: event.clientX,
            y: event.clientY,
          })
        })
        .on("mouseleave", () => setHoverInfo(null))

      chartContent.append("line")
        .datum(maxSelected)
        .attr("class", `stat-line`)
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(maxSelected))
        .attr("y2", yScale(maxSelected))
        .attr("stroke", "steelblue")
        .attr("stroke-dasharray", "4 2")
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event)
          if (!xScaleRef.current) return;
          const frame = Math.round(xScaleRef.current.invert(mx))

          if (frame < 0 || frame >= data.length) return

          const closest = {
            x: frame,
            y: maxSelected,
          }
          setHoverInfo({
            value: closest,
            x: event.clientX,
            y: event.clientY,
          })
        })
        .on("mouseleave", () => setHoverInfo(null))

      chartContent.append("line")
        .datum(meanSelected)
        .attr("class", `stat-line`)
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(meanSelected))
        .attr("y2", yScale(meanSelected))
        .attr("stroke", "green")
        .attr("stroke-dasharray", "4 2")
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event)
          if (!xScaleRef.current) return;
          const frame = Math.round(xScaleRef.current.invert(mx))

          if (frame < 0 || frame >= data.length) return

          const closest = {
            x: frame,
            y: meanSelected,
          }
          setHoverInfo({
            value: closest,
            x: event.clientX,
            y: event.clientY,
          })
        })
        .on("mouseleave", () => setHoverInfo(null))
    }

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]])
      .on("zoom", (event) => {
        const transform = event.transform
        const zx = transform.rescaleX(xScale)
        const zy = yScale
        xScaleRef.current = zx

        chartContent.selectAll("line")
          .attr("x1", zx(minX))
          .attr("x2", zx(maxX))

        xAxis.call(d3.axisBottom(zx))
        yAxis.call(d3.axisLeft(zy))

        const newLine = d3.line<DataPoint>()
          .x((d) => zx(d.x))
          .y((d) => zy(d.y))

        chartContent.selectAll<SVGPathElement, { x: number, y: number }[]>("path.main-line")
          .attr("d", d => newLine(d))


      })

    svg.call(zoom).call((zoom).transform, d3.zoomIdentity)
  }, [data, size, selectedPoint])

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold">Line Chart of Intensity by Frames</h2>
      </div>
      <div ref={containerRef} className="relative flex w-full h-95">
        <svg ref={svgRef} width={size.width} height={size.height} />
        {hoverInfo && createPortal(
          <div className="overflow-visible" style={{
            position: 'absolute',
            left: hoverInfo.x,
            top: hoverInfo.y - 20,
            pointerEvents: 'none',
            background: 'rgba(30,30,40,0.95)',
            color: 'white',
            borderRadius: 8,
            padding: '0.5em 1em',
            fontSize: 13,
            zIndex: 100
          }}>
            <>Frame: {hoverInfo.value.x.toFixed(2)} <br /> Value:  </>
          </div>
          , document.body)}
      </div>
      <div className="relative flex items-center space-x-2 text-xs">
        <div className="w-6 h-1 bg-red-500"></div>
        <span>Cell (19, 11)</span>
      </div>
    </div>

  )
}
