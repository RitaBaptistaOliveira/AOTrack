import { useEffect, useRef, type RefObject } from "react"
import * as d3 from "d3"
import type { DataPoint, MultiDataset } from "../../common/utils/types"
import { calculateStatistics } from "../utils/statistics"

interface UseLineChartRendererProps {
    svgRef: RefObject<SVGSVGElement | null>
    containerRef: RefObject<HTMLDivElement | null>
    datasets: MultiDataset
    visibleLines: Record<string, boolean>
    showStats: Record<string, boolean>
    margin?: { top: number, right: number, bottom: number, left: number }
    xLabel?: string
    yLabel?: string
}

export function useLineChartRenderer({
    svgRef,
    containerRef,
    datasets,
    visibleLines,
    showStats,
    margin = { top: 5, right: 10, bottom: 40, left: 40 },
    xLabel = "Values",
    yLabel = "Frames"
}: UseLineChartRendererProps) {
    const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
    const bisectX = d3.bisector((d: DataPoint) => d.x)

    useEffect(() => {
        /** Setup the SVG */

        if (!svgRef.current || !containerRef.current || datasets.length === 0) return
        const containerRect = containerRef.current!.getBoundingClientRect()
        const width = containerRect.width
        const height = containerRect.height

        if (width <= 0 || height <= 0) return

        const innerWidth = width - margin.left - margin.right
        const innerHeight = height - margin.top - margin.bottom

        const svg = d3.select(svgRef.current)
        svg.selectAll("*").remove()
        svg.attr("width", width).attr("height", height)

        svg.append("defs").append("clipPath").attr("id", "line-chart-clip").append("rect").attr("width", innerWidth).attr("height", innerHeight)

        /** Main group of the SVG */
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

        /** Subgroups of the SVG */
        const axes = g.append("g").attr("class", "axes")
        const chartContent = g.append("g").attr("class", "chart-content").attr("clip-path", "url(#line-chart-clip)")
        const statsGroup = chartContent.append("g").attr("class", "stats-group")
        const mainLinesGroup = chartContent.append("g").attr("class", "lines-group")
        const hoverGroup = chartContent.append("g").attr("class", "hover-group")
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background", "rgba(0,0,0,0.7)")
            .style("color", "#fff")
            .style("padding", "4px 8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("display", "none")
            .style("z-index", "9999")

        /** Axis */
        const allValues = datasets.flatMap(ds => ds.data)
        if (allValues.length === 0) return
        const xExtent = d3.extent(allValues, (d) => d.x) as [number, number]
        const yExtent = d3.extent(allValues, (d) => d.y) as [number, number]
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1
        const yDomain: [number, number] = [yExtent[0] === 0 ? 0 : yExtent[0] - yPadding, yExtent[1] + yPadding]

        const rawXScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth])
        const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0])

        const getCurrentScales = () => {
            return zoomTransformRef.current.rescaleX(rawXScale)
        }

        /** Helper Functions */

        function findClosestPoints(x0: number) {
            let points: Record<string, Record<string, DataPoint | null>> = {}
            datasets.forEach(({ pointId, dimId, data }) => {
                if (!points[pointId]) points[pointId] = {}

                const i = bisectX.center(data, x0)
                const d = data[i]
                if (d) {
                    points[pointId][dimId] = d
                }
                else points[pointId][dimId] = null
            })
            return points
        }

        function handleMouseMove(event: MouseEvent) {
            const xScale = getCurrentScales()
            const [mouseX] = d3.pointer(event)
            const x0 = xScale.invert(mouseX)
            const points = findClosestPoints(x0)

            let tooltipHtml = `<div><strong>Frame: ${x0.toFixed(0)}</strong></div>`
            let highestPoint: [number, number] | null = null

            Object.entries(points).forEach(([pointId, dims]) => {
                Object.entries(dims).forEach(([dimId, d]) => {
                    if (d) {
                        tooltipHtml += `<div><strong>${pointId} ${dimId}:</strong> ${d.y.toPrecision(2)}</div>`
                        hoverGroup.selectAll(`.circle-${pointId}-${dimId}`)
                            .attr("cx", xScale(d.x))
                            .attr("cy", yScale(d.y))
                        if (highestPoint === null || d.y > highestPoint[1]) {
                            highestPoint = [d.x, d.y]
                        }
                    }
                })
            })

            if (highestPoint !== null) {
                hoverGroup.selectAll(".hover-line")
                    .attr("x1", xScale(highestPoint[0]))
                    .attr("x2", xScale(highestPoint[0]))

                const svgRect = svgRef.current!.getBoundingClientRect()

                const tooltipNode = tooltip.node() as HTMLDivElement

                const tooltipWidth = tooltipNode.offsetWidth
                const tooltipHeight = tooltipNode.offsetHeight

                let tooltipX = svgRect.left + xScale(highestPoint[0]) - tooltipWidth / 2
                let tooltipY = svgRect.top + yScale(highestPoint[1]) - tooltipHeight - 5

                const pageWidth = window.innerWidth

                if (tooltipX < 0)
                    tooltipX = 5
                else if (tooltipX + tooltipWidth > pageWidth)
                    tooltipX = pageWidth - tooltipWidth - 5

                if (tooltipY < 0)
                    tooltipY = 5

                tooltip.html(tooltipHtml)
                    .style("left", `${tooltipX}px`)
                    .style("top", `${tooltipY}px`)
                    .style("pointer-events", "none")
            }
        }

        function handleMouseOver() {
            hoverGroup.selectAll("circle").style("display", "block")
            hoverGroup.selectAll(".hover-line").style("display", "block")
            tooltip.style("display", "block")
        }

        function handleMouseOut() {
            hoverGroup.selectAll("circle").style("display", "none")
            hoverGroup.selectAll(".hover-line").style("display", "none")
            tooltip.style("display", "none")
        }

        /** Draw the X axis and the Y axis */
        function drawAxes() {
            const xScale = getCurrentScales()
            axes.append("g")
                .attr("transform", `translate(0,${innerHeight})`)
                .attr("class", "x-axis")
                .call(d3.axisBottom(xScale))
            axes.append("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(yScale))

            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height - 5)
                .attr("text-anchor", "middle")
                .style("font-size", "14px")
                .style("font-weight", "500")
                .style("fill", "#333")
                .text(xLabel)

            svg.append("text")
                .attr("x", -height / 2)
                .attr("y", 12)
                .attr("text-anchor", "middle")
                .attr("transform", "rotate(-90)")
                .style("font-size", "14px")
                .style("font-weight", "500")
                .style("fill", "#333")
                .text(yLabel)
        }

        /** Draw the lines */
        function drawMainLines() {
            const xScale = getCurrentScales()
            hoverGroup.append("line")
                .attr("class", "hover-line")
                .attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", yScale(yDomain[0]))
                .attr("y2", yScale(yDomain[1]))
                .attr("stroke", "black")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "2, 2")

            chartContent
                .append('rect')
                .style("fill", "none")
                .style("pointer-events", "all")
                .attr('width', width)
                .attr('height', height)
                .on('mouseover', handleMouseOver)
                .on("mousemove", function (event) {
                    handleMouseMove(event)
                })
                .on('mouseout', handleMouseOut)

            const lineGenerator = d3
                .line<DataPoint>()
                .x((d) => xScale(d.x))
                .y((d) => yScale(d.y))
                .curve(d3.curveMonotoneX)


            datasets.forEach(({ pointId, dimId, data, color }) => {
                hoverGroup.append("circle")
                    .attr("class", `circle-${pointId}-${dimId}`)
                    .attr("r", 5)
                    .attr("stroke", "white")
                    .attr("stroke-width", 2)
                    .attr("fill", color)
                    .style("pointer-events", "none")

                mainLinesGroup.append("path")
                    .datum(data)
                    .attr("class", `line-${pointId}-${dimId}`)
                    .attr("fill", "none")
                    .attr("opacity", 0.75)
                    .attr("stroke", color)
                    .attr("stroke-width", 2)
                    .style("mix-blend-mode", "difference")
                    .attr("d", lineGenerator)
                    .style("display", visibleLines[pointId] ? "block" : "none")

            })
        }

        /** Draw the statistics lines */
        function drawStats() {
            datasets.forEach(({ pointId, data, color }) => {
                const isVisible = visibleLines[pointId] ?? true
                const show = showStats[pointId] ?? false
                if (!isVisible || !show) return

                const values = data.map(d => d.y)
                const { min, mean, max } = calculateStatistics(values)

                const stats = [
                    { value: min, dash: "3,3", strokeWidth: 2, label: "Min" },
                    { value: max, dash: "3,3", strokeWidth: 2, label: "Max" },
                    { value: mean, dash: "5,5", strokeWidth: 3, label: "Avg" },
                ]

                stats.forEach(stat => {
                    statsGroup.append("line")
                        .data([stat])
                        .attr("x1", 0)
                        .attr("x2", innerWidth)
                        .attr("y1", yScale(stat.value))
                        .attr("y2", yScale(stat.value))
                        .attr("stroke", color)
                        .attr("stroke-width", 2)
                        .attr("stroke-dasharray", stat.dash)
                })
            })
        }

        function setupZoom() {
            const zoom = d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.5, 15])
                .translateExtent([[0, 0], [width, height]])
                .extent([[0, 0], [width, height]])
                .on("zoom", (event) => {
                    zoomTransformRef.current = event.transform
                    const xScale = getCurrentScales()
                    axes.select<SVGGElement>(".x-axis").call(d3.axisBottom(xScale))

                    const lineGenerator = d3
                        .line<DataPoint>()
                        .x((d) => xScale(d.x))
                        .y((d) => yScale(d.y))
                        .curve(d3.curveMonotoneX)

                    mainLinesGroup.selectAll("path")
                        .attr("d", (d: any) => lineGenerator(d))

                    hoverGroup.selectAll(".hover-line")
                        .attr("x1", (d: any) => xScale(d))
                        .attr("x2", (d: any) => xScale(d))

                })

            svg.call(zoom)

            // Restore previous zoom
            if (zoomTransformRef.current.k !== 1) {
                svg.call(zoom.transform, zoomTransformRef.current)
            }
        }

        drawAxes()
        drawMainLines()
        drawStats()
        setupZoom()

        return () => {
            svg.selectAll("*").remove()
            zoomTransformRef.current = d3.zoomIdentity
        }
    }, [datasets, visibleLines, showStats])

}
