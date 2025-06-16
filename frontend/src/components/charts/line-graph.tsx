import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface DataPoint {
  x: number
  y: number
}

interface LineChartProps {
  data: DataPoint[]
  selectPoint1Data?: DataPoint[]
  selectPoint2Data?: DataPoint[]
}

export default function LineChart({ data, selectPoint1Data, selectPoint2Data }: LineChartProps) {
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
    const margin = { top: 20, right: 20, bottom: 30, left: 40 }
    const innerWidth = size.width - margin.left - margin.right
    const innerHeight = size.height - margin.top - margin.bottom

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

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

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


    function drawLineWithStats(dataSet: DataPoint[], color: string) {
      chartContent.append("path")
        .datum(dataSet)
        .attr("class", `line-${color}`)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", line);

      const minY = d3.min(dataSet, d => d.y)!;
      const maxY = d3.max(dataSet, d => d.y)!;
      const avgY = d3.mean(dataSet, d => d.y)!;

      ["min", "max", "avg"].forEach((stat) => {
        const yVal = stat === "min" ? minY : stat === "max" ? maxY : avgY;
        chartContent.append("line")
          .attr("x1", 0)
          .attr("x2", innerWidth)
          .attr("y1", yScale(yVal))
          .attr("y2", yScale(yVal))
          .attr("stroke", color)
          .attr("stroke-dasharray", "4 2");
      });

      const focus = chartContent.append("circle")
        .attr("r", 4)
        .attr("fill", color)
        .style("display", "none");

      return { focus, data: dataSet, color };
    }

    const main = drawLineWithStats(data, "steelblue");
    const p1 = selectPoint1Data ? drawLineWithStats(selectPoint1Data, "green") : null;
    const p2 = selectPoint2Data ? drawLineWithStats(selectPoint2Data, "purple") : null;

    const tooltip = tooltipRef.current;
    const overlay = chartContent
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .on("mousemove", function (event) {
        const [mouseX] = d3.pointer(event)
        const zx = xScale;
        const zy = yScale;
        const x0 = xScale.invert(mouseX)
        const bisect = d3.bisector((d: DataPoint) => d.x).left

        const hoverFor = (series: typeof main) => {
          const idx = bisect(series.data, x0);
          const d0 = series.data[Math.max(0, Math.min(idx, series.data.length - 1))];
          const cx = zx(d0.x);
          const cy = zy(d0.y);
          series.focus.attr("cx", cx).attr("cy", cy).style("display", "block");
          return d0;
        };

        const dMain = hoverFor(main);
        if (p1) hoverFor(p1);
        if (p2) hoverFor(p2);

        if (tooltip) {
          tooltip.style.display = "block";
          tooltip.style.left = `${margin.left + zx(dMain.x) + 10}px`;
          tooltip.style.top = `${margin.top + zy(dMain.y) - 20}px`;
          tooltip.innerHTML = `x: ${dMain.x}<br/>y: ${dMain.y}`;
        }

      })
      .on("mouseleave", () => {
        main.focus.style("display", "none");
        p1?.focus.style("display", "none");
        p2?.focus.style("display", "none");
        if (tooltip) tooltip.style.display = "none";
      })

    // --- Zoom Behavior ---
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .translateExtent([[0, 0], [size.width, size.height]])
      .extent([[0, 0], [size.width, size.height]])
      .on("zoom", (event) => {
        const transform = event.transform

        const zx = transform.rescaleX(xScale)
        const zy = transform.rescaleY(yScale)

        xAxisG.call(d3.axisBottom(zx))
        yAxisG.call(d3.axisLeft(zy))

        const updateLine = (series: { data: DataPoint[], color: string, focus: d3.Selection<SVGCircleElement, unknown, null, undefined> }) => {
          const lineGen = d3.line<DataPoint>()
            .x(d => zx(d.x))
            .y(d => zy(d.y));

          chartContent.select(`.line-${series.color}`)
            .attr("d", lineGen(series.data));

          series.focus.style("display", "none");
        };

        [main, p1, p2].forEach((s) => s && updateLine(s));

        chartContent.selectAll("line")
          .attr("x1", 0)
          .attr("x2", innerWidth)
          .attr("y1", function () {
            const yVal = zy.invert(+d3.select(this).attr("y1"));
            return zy(yVal);
          })
          .attr("y2", function () {
            const yVal = zy.invert(+d3.select(this).attr("y2"));
            return zy(yVal);
          });

        overlay.on("mousemove", function (event) {
          const [mouseX] = d3.pointer(event)
          const x0 = zx.invert(mouseX)
          const bisect = d3.bisector((d: DataPoint) => d.x).left
          const hoverFor = (series: typeof main) => {
            const idx = bisect(series.data, x0);
            const d0 = series.data[Math.max(0, Math.min(idx, series.data.length - 1))];
            const cx = zx(d0.x);
            const cy = zy(d0.y);
            series.focus.attr("cx", cx).attr("cy", cy).style("display", "block");
            return d0;
          };

          const dMain = hoverFor(main);
          if (p1) hoverFor(p1);
          if (p2) hoverFor(p2);

          if (tooltip) {
            tooltip.style.display = "block";
            tooltip.style.left = `${margin.left + zx(dMain.x) + 10}px`;
            tooltip.style.top = `${margin.top + zy(dMain.y) - 20}px`;
            tooltip.innerHTML = `x: ${dMain.x}<br/>y: ${dMain.y}`;
          }
        })
      })

    svg.call(zoom as any).call((zoom as any).transform, d3.zoomIdentity);

  }, [data, size, selectPoint1Data, selectPoint2Data,])

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
