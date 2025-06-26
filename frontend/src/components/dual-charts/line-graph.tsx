import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { createPortal } from "react-dom"
import type { DataPoint } from "@/types/visualization"

interface LineChartProps {
  data: [DataPoint[], DataPoint[]]
  selectedPoint?: [DataPoint[], DataPoint[]]
}

export default function DualLineChart({ data, selectedPoint }: LineChartProps) {
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

    const intensitiesDefaultX = data[0].map((d) => d.y)
    const intensitiesDefaultY = data[1].map((d) => d.y)
    const intensitiesPointX = selectedPoint?.[0]?.map((d) => d.y)
    const intensitiesPointY = selectedPoint?.[1]?.map((d) => d.y)

    const allY = [...intensitiesDefaultX, ...intensitiesDefaultY, ...(intensitiesPointX ?? []), ...(intensitiesPointY ?? [])]
    const [XminX, XmaxX] = d3.extent(data[0], (d) => d.x) as [number, number]
    const [YminX, YmaxX] = d3.extent(data[1], (d) => d.x) as [number, number]

    const minX = Math.min(XminX, YminX)
    const maxX = Math.min(XmaxX, YmaxX)

    const yMax = d3.max(allY.flat())!
    const yMin = d3.min(allY.flat())!

    const xScale = d3.scaleLinear().domain([minX, maxX]).range([1, width])
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([height, 0])

    xScaleRef.current = xScale
    yScaleRef.current = yScale

    const xAxis = svg.append("g").attr("transform", `translate(${margin.left},${height + margin.top})`).attr("class", "x-axis").call(d3.axisBottom(xScale))
    const yAxis = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`).attr("class", "y-axis").call(d3.axisLeft(yScale))

    const line = d3.line<DataPoint>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))

    chartContent.append("path")
      .datum(data[0])
      .attr("class", `main-line`)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line)
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event)
        if (!xScaleRef.current) return;
        const zx = xScaleRef.current.invert(mx)

        const closest = data[0].reduce((a, b) =>
          Math.abs(a.x - zx) < Math.abs(b.x - zx) ? a : b
        )
        setHoverInfo({
          value: closest,
          x: event.clientX,
          y: event.clientY,
        })
      })
      .on("mouseleave", () => setHoverInfo(null))

    chartContent.append("path")
      .datum(data[1])
      .attr("class", `main-line`)
      .attr("fill", "none")
      .attr("stroke", "deepskyblue")
      .attr("stroke-width", 2)
      .attr("d", line)
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event)
        if (!xScaleRef.current) return;
        const zx = xScaleRef.current.invert(mx)

        const closest = data[1].reduce((a, b) =>
          Math.abs(a.x - zx) < Math.abs(b.x - zx) ? a : b
        )
        setHoverInfo({
          value: closest,
          x: event.clientX,
          y: event.clientY,
        })
      })
      .on("mouseleave", () => setHoverInfo(null))

    const Xmin = d3.min(data[0], d => d.y)!
    const Xmax = d3.max(data[0], d => d.y)!
    const Xmean = d3.mean(data[0], d => d.y)!
    const Ymin = d3.min(data[1], d => d.y)!
    const Ymax = d3.max(data[1], d => d.y)!
    const Ymean = d3.mean(data[1], d => d.y)!

    chartContent.append("line")
      .datum(Xmin)
      .attr("class", `stat-line`)
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(Xmin))
      .attr("y2", yScale(Xmin))
      .attr("stroke", "lightsteelblue")
      .attr("stroke-dasharray", "4 2")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event)
        if (!xScaleRef.current) return;
        const frame = Math.round(xScaleRef.current.invert(mx))

        if (frame < 0 || frame >= data.length) return

        const closest = {
          x: frame,
          y: Xmin,
        }
        setHoverInfo({
          value: closest,
          x: event.clientX,
          y: event.clientY,
        })
      })
      .on("mouseleave", () => setHoverInfo(null))

    chartContent.append("line")
      .datum(Xmax)
      .attr("class", `stat-line`)
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(Xmax))
      .attr("y2", yScale(Xmax))
      .attr("stroke", "midnightblue")
      .attr("stroke-dasharray", "4 2")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event)
        if (!xScaleRef.current) return;
        const frame = Math.round(xScaleRef.current.invert(mx))

        if (frame < 0 || frame >= data.length) return

        const closest = {
          x: frame,
          y: Xmax,
        }
        setHoverInfo({
          value: closest,
          x: event.clientX,
          y: event.clientY,
        })
      })
      .on("mouseleave", () => setHoverInfo(null))

    chartContent.append("line")
      .datum(Xmean)
      .attr("class", `stat-line`)
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(Xmean))
      .attr("y2", yScale(Xmean))
      .attr("stroke", "steelblue")
      .attr("stroke-dasharray", "4 2")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event)
        if (!xScaleRef.current) return;
        const frame = Math.round(xScaleRef.current.invert(mx))

        if (frame < 0 || frame >= data.length) return

        const closest = {
          x: frame,
          y: Xmean,
        }
        setHoverInfo({
          value: closest,
          x: event.clientX,
          y: event.clientY,
        })
      })
      .on("mouseleave", () => setHoverInfo(null))

    chartContent.append("line")
      .datum(Ymin)
      .attr("class", `stat-line`)
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(Ymin))
      .attr("y2", yScale(Ymin))
      .attr("stroke", "lightskyblue")
      .attr("stroke-dasharray", "4 2")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event)
        if (!xScaleRef.current) return;
        const frame = Math.round(xScaleRef.current.invert(mx))

        if (frame < 0 || frame >= data.length) return

        const closest = {
          x: frame,
          y: Ymin,
        }
        setHoverInfo({
          value: closest,
          x: event.clientX,
          y: event.clientY,
        })
      })
      .on("mouseleave", () => setHoverInfo(null))

    chartContent.append("line")
      .datum(Ymax)
      .attr("class", `stat-line`)
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(Ymax))
      .attr("y2", yScale(Ymax))
      .attr("stroke", "blue")
      .attr("stroke-dasharray", "4 2")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event)
        if (!xScaleRef.current) return;
        const frame = Math.round(xScaleRef.current.invert(mx))

        if (frame < 0 || frame >= data.length) return

        const closest = {
          x: frame,
          y: Ymax,
        }
        setHoverInfo({
          value: closest,
          x: event.clientX,
          y: event.clientY,
        })
      })
      .on("mouseleave", () => setHoverInfo(null))

    chartContent.append("line")
      .datum(Ymean)
      .attr("class", `stat-line`)
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(Ymean))
      .attr("y2", yScale(Ymean))
      .attr("stroke", "deepskyblue")
      .attr("stroke-dasharray", "4 2")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event)
        if (!xScaleRef.current) return;
        const frame = Math.round(xScaleRef.current.invert(mx))

        if (frame < 0 || frame >= data.length) return

        const closest = {
          x: frame,
          y: Ymean,
        }
        setHoverInfo({
          value: closest,
          x: event.clientX,
          y: event.clientY,
        })
      })
      .on("mouseleave", () => setHoverInfo(null))

    if (selectedPoint?.length) {
      chartContent.append("path")
        .datum(selectedPoint[0])
        .attr("class", `main-line`)
        .attr("fill", "none")
        .attr("stroke", "limegreen")
        .attr("stroke-width", 2)
        .attr("d", line)
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event)
          if (!xScaleRef.current) return;
          const zx = xScaleRef.current.invert(mx)

          const closest = selectedPoint[0].reduce((a, b) =>
            Math.abs(a.x - zx) < Math.abs(b.x - zx) ? a : b
          )
          setHoverInfo({
            value: closest,
            x: event.clientX,
            y: event.clientY,
          })
        })
        .on("mouseleave", () => setHoverInfo(null))

      const minSelectedX = d3.min(selectedPoint[0], d => d.y)!
      const maxSelectedX = d3.max(selectedPoint[0], d => d.y)!
      const meanSelectedX = d3.mean(selectedPoint[0], d => d.y)!
      const minSelectedY = d3.min(selectedPoint[1], d => d.y)!
      const maxSelectedY = d3.max(selectedPoint[1], d => d.y)!
      const meanSelectedY = d3.mean(selectedPoint[1], d => d.y)!

      chartContent.append("line")
        .datum(minSelectedX)
        .attr("class", `stat-line`)
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(minSelectedX))
        .attr("y2", yScale(minSelectedX))
        .attr("stroke", "palegreen")
        .attr("stroke-dasharray", "4 2")
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event)
          if (!xScaleRef.current) return;
          const frame = Math.round(xScaleRef.current.invert(mx))

          if (frame < 0 || frame >= data.length) return

          const closest = {
            x: frame,
            y: minSelectedX,
          }
          setHoverInfo({
            value: closest,
            x: event.clientX,
            y: event.clientY,
          })
        })
        .on("mouseleave", () => setHoverInfo(null))

      chartContent.append("line")
        .datum(maxSelectedX)
        .attr("class", `stat-line`)
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(maxSelectedX))
        .attr("y2", yScale(maxSelectedX))
        .attr("stroke", "seagreen")
        .attr("stroke-dasharray", "4 2")
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event)
          if (!xScaleRef.current) return;
          const frame = Math.round(xScaleRef.current.invert(mx))

          if (frame < 0 || frame >= data.length) return

          const closest = {
            x: frame,
            y: maxSelectedX,
          }
          setHoverInfo({
            value: closest,
            x: event.clientX,
            y: event.clientY,
          })
        })
        .on("mouseleave", () => setHoverInfo(null))

      chartContent.append("line")
        .datum(meanSelectedX)
        .attr("class", `stat-line`)
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(meanSelectedX))
        .attr("y2", yScale(meanSelectedX))
        .attr("stroke", "mediumseagreen")
        .attr("stroke-dasharray", "4 2")
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event)
          if (!xScaleRef.current) return;
          const frame = Math.round(xScaleRef.current.invert(mx))

          if (frame < 0 || frame >= data.length) return

          const closest = {
            x: frame,
            y: meanSelectedX,
          }
          setHoverInfo({
            value: closest,
            x: event.clientX,
            y: event.clientY,
          })
        })
        .on("mouseleave", () => setHoverInfo(null))

      chartContent.append("line")
        .datum(minSelectedY)
        .attr("class", `stat-line`)
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(minSelectedY))
        .attr("y2", yScale(minSelectedY))
        .attr("stroke", "lightgreen")
        .attr("stroke-dasharray", "4 2")
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event)
          if (!xScaleRef.current) return;
          const frame = Math.round(xScaleRef.current.invert(mx))

          if (frame < 0 || frame >= data.length) return

          const closest = {
            x: frame,
            y: minSelectedY,
          }
          setHoverInfo({
            value: closest,
            x: event.clientX,
            y: event.clientY,
          })
        })
        .on("mouseleave", () => setHoverInfo(null))

      chartContent.append("line")
        .datum(maxSelectedY)
        .attr("class", `stat-line`)
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(maxSelectedY))
        .attr("y2", yScale(maxSelectedY))
        .attr("stroke", "forestgreen")
        .attr("stroke-dasharray", "4 2")
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event)
          if (!xScaleRef.current) return;
          const frame = Math.round(xScaleRef.current.invert(mx))

          if (frame < 0 || frame >= data.length) return

          const closest = {
            x: frame,
            y: maxSelectedY,
          }
          setHoverInfo({
            value: closest,
            x: event.clientX,
            y: event.clientY,
          })
        })
        .on("mouseleave", () => setHoverInfo(null))

      chartContent.append("line")
        .datum(meanSelectedY)
        .attr("class", `stat-line`)
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(meanSelectedY))
        .attr("y2", yScale(meanSelectedY))
        .attr("stroke", "limegreen")
        .attr("stroke-dasharray", "4 2")
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event)
          if (!xScaleRef.current) return;
          const frame = Math.round(xScaleRef.current.invert(mx))

          if (frame < 0 || frame >= data.length) return

          const closest = {
            x: frame,
            y: meanSelectedY,
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
    <div ref={containerRef} className="relative h-full w-full flex">
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
          <>Frame: {hoverInfo.value.x.toFixed(2)} <br /> Value: {hoverInfo.value.y.toFixed(2)} </>
        </div>
        , document.body)}
    </div>
  )
}
