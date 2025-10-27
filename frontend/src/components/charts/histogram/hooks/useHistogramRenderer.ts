import { useEffect, useRef, type RefObject } from "react"
import * as d3 from "d3"
import type { MultiDataset } from "../../common/utils/types"
import { calculateStatistics } from "../utils/statistics"
import { generateKDE } from "../utils/kde"
import type { DataPoint } from "@/types/visualization"

interface UseHistogramRendererProps {
    svgRef: RefObject<SVGSVGElement | null>
    containerRef: RefObject<HTMLDivElement | null>
    datasets: MultiDataset
    visibleLines: Record<string, boolean>
    showKDE: Record<string, boolean>
    showStats: Record<string, boolean>
    binCount: number
    margin?: { top: number, right: number, bottom: number, left: number }
    xLabel?: string
    yLabel?: string
}

export function useHistogramRenderer({
    svgRef,
    containerRef,
    datasets,
    visibleLines,
    showKDE,
    showStats,
    binCount,
    margin = { top: 5, right: 10, bottom: 40, left: 40 },
    xLabel = "Values",
    yLabel = "Count"
}: UseHistogramRendererProps) {
    const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)

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

        svg.append("defs").append("clipPath").attr("id", "histogram-clip").append("rect").attr("width", innerWidth).attr("height", innerHeight)

        /** Main group of the SVG */
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

        /** Subgroups of the SVG */
        const axes = g.append("g").attr("class", "axes")
        const chartContent = g.append("g").attr("class", "chart-content").attr("clip-path", "url(#histogram-clip)")
        const kdeGroup = chartContent.append("g").attr("class", "kde-group")
        const statsGroup = chartContent.append("g").attr("class", "stats-group")
        const barsGroup = chartContent.append("g").attr("class", "bars-group")
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

        /** X Scale */
        const allValues = datasets.flatMap(ds => ds.data.map(d => d.y))
        if (allValues.length === 0) return
        const xExtent = d3.extent(allValues) as [number, number]
        const rawXScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth])
        const xScale = zoomTransformRef.current.rescaleX(rawXScale)

        /** Generate bins */
        const generator = d3.bin()
            .domain(xExtent)
            .thresholds(binCount)


        const datasetBins = datasets.map((dataset) => {
            const values = dataset.data.map((d) => d.y)
            const bins = generator(values)
            return { dataset, bins }
        })

        /** Y Scale */
        const maxCount = d3.max(datasetBins.flatMap(db => db.bins), d => d.length) || 0
        const yScale = d3.scaleLinear().domain([0, maxCount]).range([innerHeight, 0])


        /** Helper Functions */

        function handleMouseOver(bin: d3.Bin<number, number>) {
            const { x0, x1 } = bin
            if (x0 === undefined || x1 === undefined) return

            /** Get all bars in the range */
            const overlapped = barsGroup.selectAll("rect")
                .filter(function (d: any) {
                    return d.x0 === x0 && d.x1 === x1
                })
            if (overlapped.empty()) return


            overlapped.sort((a: any, b: any) => a.length - b.length)
                .each(function () {
                    const el = this as SVGElement
                    if (el.parentNode) {
                        el.parentNode.appendChild(el)
                    }
                })


            /** Create tooltip content */
            const countsByDataset: Record<string, Record<string, number>> = {}
            overlapped.each(function (d: any) {
                const el = d3.select(this)
                const cls = el.attr("class") || ""
                const match = cls.match(/^bar-(.+?)-(.+)$/)
                if (!match) return

                const pointId = match[1]
                const dimId = match[2]
                if (!countsByDataset[pointId]) countsByDataset[pointId] = {}
                countsByDataset[pointId][dimId] = d.length
            })

            let tooltipHtml = `<div><strong>Range: ${x0.toFixed(0)} - ${x1.toFixed(0)}</strong></div>`
            for (const pid in countsByDataset) {
                tooltipHtml += `<div><strong>${pid}</strong></div>`
                for (const did in countsByDataset[pid]) {
                    tooltipHtml += `<div style="margin-left:12px;">${did}: ${countsByDataset[pid][did]}</div>`
                }
            }

            tooltip.style("display", "block").html(tooltipHtml)

            /** Highlight bars */
            overlapped
                .style("mix-blend-mode", "normal")
                .attr("stroke-width", 2)
        }

        function handleMouseOut(bin: d3.Bin<number, number>) {
            const { x0, x1 } = bin
            if (x0 === undefined || x1 === undefined) return

            const overlapped = barsGroup.selectAll("rect")
                .filter((bin: any) => bin.x0 === x0 && bin.x1 === x1)
            if (overlapped.empty()) return

            /** Reset tooltip */
            tooltip.style("display", "none")

            /**Reset highlights */
            overlapped
                .style("mix-blend-mode", "difference")
                .attr("stroke-width", 1)
        }

        function handleMouseMove(e: MouseEvent) {
            const tooltipNode = tooltip.node() as HTMLDivElement
            if (!tooltipNode) return

            const tooltipWidth = tooltipNode.offsetWidth
            const tooltipHeight = tooltipNode.offsetHeight

            let left = e.pageX + 10
            let top = e.pageY - 10

            // Adjust if tooltip would go off the right edge
            if (left + tooltipWidth > window.innerWidth) {
                left = e.pageX - tooltipWidth - 10
            }

            // Adjust if tooltip would go off the bottom edge
            if (top + tooltipHeight > window.innerHeight) {
                top = e.pageY - tooltipHeight - 10
            }

            tooltip
                .style("left", left + "px")
                .style("top", top + "px")
        }

        /** Draw the X axis and the Y axis */
        function drawAxes() {
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

        /** Draw the histogram bars */
        function drawBars() {
            datasetBins.forEach(({ dataset, bins }) => {
                barsGroup
                    .selectAll(`.bar-${dataset.pointId}-${dataset.dimId}`)
                    .data(bins)
                    .enter()
                    .append("rect")
                    .attr("class", `bar-${dataset.pointId}-${dataset.dimId}`)
                    .attr("x", (d) => xScale(d.x0!))
                    .attr("y", (d) => yScale(d.length))
                    .attr("width", (d) => Math.max(0, xScale(d.x1!) - xScale(d.x0!)))
                    .attr("height", (d) => innerHeight - yScale(d.length))
                    .attr("fill", dataset.color)
                    .attr("opacity", 0.75)
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .style("mix-blend-mode", "difference")
                    .style("display", visibleLines[dataset.pointId] ? "block" : "none")
                    .on("mouseover", function (_event, d) {
                        handleMouseOver(d)
                    })
                    .on("mouseout", function (_event, d) {
                        handleMouseOut(d)
                    })
                    .on("mousemove", function (event, _d) {
                        handleMouseMove(event)
                    })

            })
        }

        /** Draw the KDE curves */
        function drawKDE() {
            const lineGenerator = d3.line<DataPoint>()
                .x(d => xScale(d.x))
                .y(d => yScale(d.y))
                .curve(d3.curveCardinal)

            datasetBins.forEach(({ dataset }) => {
                const isVisible = visibleLines[dataset.pointId] ?? true
                const show = showKDE[dataset.pointId] ?? false
                if (!isVisible || !show) return

                const values = dataset.data.map(d => d.y)
                const kde = generateKDE(values, xExtent, maxCount * 0.8)

                kdeGroup.append("path")
                    .datum(kde)
                    .attr("class", `kde-${dataset.pointId}-${dataset.dimId}`)
                    .attr("fill", "none")
                    .attr("stroke", dataset.color)
                    .attr("stroke-width", 2)
                    .attr("opacity", 0.8)
                    .attr("d", lineGenerator)
            })
        }

        /** Draw the statistics lines */
        function drawStats() {
            datasetBins.forEach(({ dataset }) => {
                const isVisible = visibleLines[dataset.pointId] ?? true
                const show = showStats[dataset.pointId] ?? false
                if (!isVisible || !show) return

                const values = dataset.data.map(d => d.y)
                const { mean, median } = calculateStatistics(values)

                const stats = [
                    { value: mean, label: "Mean", dash: "none" },
                    { value: median, label: "Median", dash: "4,4" }
                ]

                stats.forEach(stat => {
                    statsGroup.append("line")
                        .data([stat])
                        .attr("x1", xScale(stat.value))
                        .attr("x2", xScale(stat.value))
                        .attr("y1", 0)
                        .attr("y2", innerHeight)
                        .attr("stroke", dataset.color)
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

                    /** Update axes */
                    const newXScale = event.transform.rescaleX(rawXScale)
                    axes.select<SVGGElement>(".x-axis").call(d3.axisBottom(newXScale))


                    /** Update groups */
                    barsGroup.selectAll("rect")
                        .attr("x", (d: any) => newXScale(d.x0!))
                        .attr("width", (d: any) => Math.max(0, newXScale(d.x1!) - newXScale(d.x0!)))

                    const newLineGenerator = d3.line<{ x: number, y: number }>()
                        .x(d => newXScale(d.x))
                        .y(d => yScale(d.y))
                        .curve(d3.curveCardinal)

                    kdeGroup.selectAll("path")
                        .attr("d", (d: any) => newLineGenerator(d))


                    statsGroup.selectAll("line")
                        .attr("x1", (d: any) => newXScale(d.value))
                        .attr("x2", (d: any) => newXScale(d.value))
                })

            svg.call(zoom)

            // Restore previous zoom
            if (zoomTransformRef.current.k !== 1) {
                svg.call(zoom.transform, zoomTransformRef.current)
            }
        }

        drawAxes()
        drawBars()
        drawKDE()
        drawStats()
        setupZoom()

        return () => {
            svg.selectAll("*").remove()
            zoomTransformRef.current = d3.zoomIdentity
        }
    }, [datasets, visibleLines, showKDE, showStats, binCount])
    return
}