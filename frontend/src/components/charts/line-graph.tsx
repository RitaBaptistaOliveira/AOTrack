import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface DataPoint {
  x: number;
  y: number;
}

interface LineChartProps {
  data: DataPoint[];
  selectPoint?: DataPoint[];
}

export default function LineChart({ data, selectPoint}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement || !data.length) return;

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const innerWidth = size.width - margin.left - margin.right;
    const innerHeight = size.height - margin.top - margin.bottom;

    const svg = d3.select(svgElement);
    svg.selectAll("*").remove();

    svg.append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight);

    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, (d) => d.x) as [number, number])
      .range([0, innerWidth]);

    const allData = [data, selectPoint].filter(Boolean) as DataPoint[][];
    const yMax = d3.max(allData.flat(), d => d.y)!;

    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([innerHeight, 0]);

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    const line = d3.line<DataPoint>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y));

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xAxisG = g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);

    const yAxisG = g.append("g").call(yAxis);

    const chartContent = g.append("g").attr("clip-path", "url(#clip)");

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

      chartContent.append("line")
        .attr("class", `stat-line-${color}-min`)
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", yScale(minY))
        .attr("y2", yScale(minY))
        .attr("stroke", color)
        .attr("stroke-dasharray", "4 2");

      chartContent.append("line")
        .attr("class", `stat-line-${color}-max`)
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", yScale(maxY))
        .attr("y2", yScale(maxY))
        .attr("stroke", color)
        .attr("stroke-dasharray", "4 2");

      chartContent.append("line")
        .attr("class", `stat-line-${color}-avg`)
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", yScale(avgY))
        .attr("y2", yScale(avgY))
        .attr("stroke", color)
        .attr("stroke-dasharray", "4 2");

      const focus = chartContent.append("circle")
        .attr("r", 4)
        .attr("fill", color)
        .style("display", "none");

      return { focus, data: dataSet, color, minY, maxY, avgY };
    }

    const main = drawLineWithStats(data, "steelblue");
    const p1 = selectPoint ? drawLineWithStats(selectPoint, "green") : null;

    const tooltip = tooltipRef.current;
    const overlay = chartContent.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .style("cursor", "crosshair");

    const updateFocus = (mouseX: number, zx: any, zy: any) => {
      const x0 = zx.invert(mouseX);
      const bisect = d3.bisector((d: DataPoint) => d.x).left;

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

      if (tooltip) {
        tooltip.style.display = "block";
        tooltip.style.left = `${margin.left + zx(dMain.x) + 10}px`;
        tooltip.style.top = `${margin.top + zy(dMain.y) - 20}px`;
        tooltip.innerHTML = `x: ${dMain.x}<br/>y: ${dMain.y}`;
      }
    };

    overlay
      .on("mousemove", function (event) {
        const [mouseX] = d3.pointer(event);
        updateFocus(mouseX, xScale, yScale);
      })
      .on("mouseleave", () => {
        main.focus.style("display", "none");
        p1?.focus.style("display", "none");
        if (tooltip) tooltip.style.display = "none";
      });

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .translateExtent([[0, 0], [size.width, size.height]])
      .extent([[0, 0], [size.width, size.height]])
      .on("zoom", (event) => {
        const transform = event.transform;
        const zx = transform.rescaleX(xScale);
        const zy = transform.rescaleY(yScale);

        xAxisG.call(d3.axisBottom(zx));
        yAxisG.call(d3.axisLeft(zy));

        const updateLine = (series: typeof main & { minY: number, maxY: number, avgY: number }) => {
          const lineGen = d3.line<DataPoint>()
            .x((d) => zx(d.x))
            .y((d) => zy(d.y));

          chartContent.select(`.line-${series.color}`).attr("d", lineGen(series.data));
          series.focus.style("display", "none");

          chartContent.select(`.stat-line-${series.color}-min`)
            .attr("y1", zy(series.minY)).attr("y2", zy(series.minY));
          chartContent.select(`.stat-line-${series.color}-max`)
            .attr("y1", zy(series.maxY)).attr("y2", zy(series.maxY));
          chartContent.select(`.stat-line-${series.color}-avg`)
            .attr("y1", zy(series.avgY)).attr("y2", zy(series.avgY));
        };

        [main, p1].forEach(s => s && updateLine(s));

        overlay.on("mousemove", function (event) {
          const [mouseX] = d3.pointer(event);
          updateFocus(mouseX, zx, zy);
        });
      });

    svg.call(zoom as any).call((zoom as any).transform, d3.zoomIdentity);
  }, [data, size, selectPoint]);

  return (
    <div ref={containerRef} className="relative h-full w-full flex">
      <svg ref={svgRef} width={size.width} height={size.height} />
      <div
        ref={tooltipRef}
        className="absolute text-xs bg-white shadow px-2 py-1 rounded border pointer-events-none"
        style={{ display: "none", position: "absolute", zIndex: 10 }}
      />
    </div>
  );
}
