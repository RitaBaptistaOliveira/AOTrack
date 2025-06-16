import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface DataPoint {
    x: number
    y: number
}

interface HistogramChartProps {
    data: DataPoint[]
    selectedPoint?: DataPoint[]
}

export default function HistogramChart({ data, selectedPoint }: HistogramChartProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const svgRef = useRef<SVGSVGElement | null>(null)
    const [size, setSize] = useState({ width: 0, height: 0 })
    const [numBins, setNumBins] = useState(30)

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

        const margin = { top: 20, right: 20, bottom: 30, left: 40 }
        const innerWidth = size.width - margin.left - margin.right
        const innerHeight = size.height - margin.top - margin.bottom

        const svg = d3.select(svgRef.current)
        svg.selectAll("*").remove()

        svg.append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", innerWidth)
            .attr("height", innerHeight)

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)
        const chartContent = g.append("g").attr("clip-path", "url(#clip)")
        let selectedBarGroup: d3.Selection<SVGRectElement, d3.Bin<number, number>, SVGGElement, unknown>;
        const dataY = data.map((d) => d.y);
        const selectedY = selectedPoint?.map((d) => d.y) ?? [];
        const allY = [...dataY, ...selectedY];

        const xScale = d3
            .scaleLinear()
            .domain(d3.extent(allY) as [number, number])
            .nice()
            .range([0, innerWidth])

        const mean = d3.mean(dataY)!
        const std = d3.deviation(dataY)!

        const domain = d3.extent(allY) as [number, number]
        const binStep = (domain[1] - domain[0]) / numBins
        const binThresholds = d3.range(domain[0], domain[1], binStep)

        const bins = d3
            .bin()
            .domain(domain)
            .thresholds(binThresholds)(dataY)

        const selectedBins = d3
            .bin()
            .domain(domain)
            .thresholds(binThresholds)(selectedY)

        const yScale = d3
            .scaleLinear()
            .domain([0, d3.max(bins, (d) => d.length)!])
            .nice()
            .range([innerHeight, 0])

        const xAxisG = g
            .append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale))

        g.append("g").call(d3.axisLeft(yScale))

        const barGroup = chartContent
            .selectAll("rect")
            .data(bins)
            .enter()
            .append("rect")
            .attr("x", (d) => xScale(d.x0!))
            .attr("y", (d) => yScale(d.length))
            .attr("width", (d) => xScale(d.x1!) - xScale(d.x0!) - 1)
            .attr("height", (d) => innerHeight - yScale(d.length))
            .attr("fill", "steelblue")

        const meanLine = chartContent
            .append("line")
            .attr("x1", xScale(mean))
            .attr("x2", xScale(mean))
            .attr("y1", 0)
            .attr("y2", innerHeight)
            .attr("stroke", "red")
            .attr("stroke-dasharray", "4 2")

        const normalDensity = (x: number) => {
            const coef = 1 / (std * Math.sqrt(2 * Math.PI))
            const exp = Math.exp(-0.5 * Math.pow((x - mean) / std, 2))
            return coef * exp
        }

        const scaleFactor = d3.max(bins, (d) => d.length)! / normalDensity(mean)
        const densityData = d3
            .range(xScale.domain()[0], xScale.domain()[1], (xScale.domain()[1] - xScale.domain()[0]) / 100)
            .map((x) => ({
                x,
                y: normalDensity(x) * scaleFactor,
            }))

        const lineGen = d3
            .line<{ x: number; y: number }>()
            .x((d) => xScale(d.x))
            .y((d) => yScale(d.y))

        const curvePath = chartContent
            .append("path")
            .datum(densityData)
            .attr("class", "density-curve")
            .attr("fill", "none")
            .attr("stroke", "purple")
            .attr("stroke-width", 2)
            .attr("d", lineGen)

        console.log("[HistogramChart] Rendering chart")
        console.log("[HistogramChart] Data count:", data.length)
        console.log("[HistogramChart] Selected points:", selectedPoint)

        if (selectedPoint?.length) {
            const selectedY = selectedPoint.map((d) => d.y);

            const selMean = d3.mean(selectedY)!
            const selStd = d3.deviation(selectedY)!

            const selNormalDensity = (x: number) => {
                const coef = 1 / (selStd * Math.sqrt(2 * Math.PI))
                const exp = Math.exp(-0.5 * Math.pow((x - selMean) / selStd, 2))
                return coef * exp
            }

            const selScaleFactor = d3.max(bins, (d) => d.length)! / selNormalDensity(selMean)
            const selDensityData = d3
                .range(xScale.domain()[0], xScale.domain()[1], (xScale.domain()[1] - xScale.domain()[0]) / 100)
                .map((x) => ({
                    x,
                    y: selNormalDensity(x) * selScaleFactor,
                }))

            chartContent
                .append("path")
                .datum(selDensityData)
                .attr("fill", "none")
                .attr("stroke", "orange")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5 2")
                .attr("d", d3.line<{ x: number; y: number }>()
                    .x((d) => xScale(d.x))
                    .y((d) => yScale(d.y)))

            // Assign properly here
            selectedBarGroup = chartContent
                .selectAll<SVGRectElement, d3.Bin<number, number>>("rect.selected-bar")
                .data(selectedBins)
                .enter()
                .append("rect")
                .attr("class", "selected-bar")
                .attr("x", (d) => xScale(d.x0!))
                .attr("y", (d) => yScale(d.length))
                .attr("width", (d) => xScale(d.x1!) - xScale(d.x0!) - 1)
                .attr("height", (d) => innerHeight - yScale(d.length))
                .attr("fill", "orange")
                .attr("fill-opacity", 0.6);
        } else {
            // Assign an empty selection with correct type (not inferred as never)
            selectedBarGroup = chartContent.selectAll<SVGRectElement, d3.Bin<number, number>>("rect.__none__");
        }
        // Labels
        svg
            .append("text")
            .attr("x", size.width / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .text("Distribution of Y Values")

        svg
            .append("text")
            .attr("x", size.width / 2)
            .attr("y", size.height - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text("Y Value")

        svg
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -size.height / 2)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text("Count")

        // Zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 10])
            .translateExtent([[0, 0], [innerWidth, innerHeight]])
            .extent([[0, 0], [innerWidth, innerHeight]])
            .on("zoom", (event) => {
                const transform = event.transform
                const zx = transform.rescaleX(xScale)

                xAxisG.call(d3.axisBottom(zx))

                barGroup
                    .attr("x", (d) => zx(d.x0!))
                    .attr("width", (d) => zx(d.x1!) - zx(d.x0!) - 1)

                meanLine
                    .attr("x1", zx(mean))
                    .attr("x2", zx(mean))

                const zoomedLine = d3
                    .line<{ x: number; y: number }>()
                    .x((d) => zx(d.x))
                    .y((d) => yScale(d.y))

                curvePath.attr("d", zoomedLine(densityData))

                selectedBarGroup
                    .attr("x", (d) => zx(d.x0!))
                    .attr("width", (d) => zx(d.x1!) - zx(d.x0!) - 1)

                const orangeLine = d3.line<{ x: number; y: number }>()
                    .x((d) => zx(d.x))
                    .y((d) => yScale(d.y));

                chartContent.selectAll("path")
                    .filter((d, i, nodes) => d3.select(nodes[i]).attr("stroke") === "orange")
                    .attr("d", function (d: any) {
                        return orangeLine(d);
                    });
            })

        svg.call(zoom).call(zoom.transform, d3.zoomIdentity)
    }, [data, size, numBins, selectedPoint])

    return (
        <div className="flex flex-col h-full">
            <div className="flex top-2 w-10 right-0 z-10 bg-white bg-opacity-80 p-2 rounded shadow">
                <input
                    type="number"
                    min={10}
                    max={Math.min(100, Math.floor(data.length / 2))}
                    value={numBins}
                    onChange={(e) => setNumBins(+e.target.value)}
                    className="border px-1 text-xs w-10"
                />
            </div>
            <div ref={containerRef} className="flex w-full h-full">
                <svg ref={svgRef} width={size.width} height={size.height} />
            </div>
        </div>

    )
}
