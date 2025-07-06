"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import type { DataPoint, D3LineChartProps } from "@/types/line"
import { BarChart3 } from "lucide-react"
import { Button } from "../ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"

interface Statistics {
    min: number
    max: number
    avg: number
}

const D3LineChart: React.FC<D3LineChartProps> = ({ data1 = [], data2 = [], config1, config2 }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity) // Add this line
    // Internal state for line visibility (controlled by legend only)
    const [visibleLines, setVisibleLines] = useState({ line1: true, line2: true })

    const [showStats, setShowStats] = useState({ line1: false, line2: false })

    const margin = { top: 5, right: 10, bottom: 40, left: 55 }
    const colors = ["#3b82f6", "#ef4444"]

    const datasets = [
        { data: data1, config: config1, key: "line1", color: colors[0], name: "Line 1" },
        { data: data2, config: config2, key: "line2", color: colors[1], name: "Line 2" },
    ] as const

    // Calculate statistics
    const getStatistics = (data: DataPoint[]): Statistics => {
        if (data.length === 0) return { min: 0, max: 0, avg: 0 }
        const values = data.map((d) => d.y)
        return {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        }
    }

    const createStatLine = (
        chartContent: d3.Selection<SVGGElement, unknown, null, undefined>,
        yScale: d3.ScaleLinear<number, number>,
        innerWidth: number,
        value: number,
        color: string,
        dashArray: string,
        strokeWidth: number,
        className: string,
    ) => {
        chartContent
            .append("line")
            .attr("class", className)
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", yScale(value))
            .attr("y2", yScale(value))
            .attr("stroke", color)
            .attr("stroke-width", strokeWidth)
            .attr("stroke-dasharray", dashArray)
            .attr("opacity", 0.7)
    }

    const createStatLabel = (
        chartContent: d3.Selection<SVGGElement, unknown, null, undefined>,
        yScale: d3.ScaleLinear<number, number>,
        x: number,
        value: number,
        color: string,
        anchor: "start" | "end",
        label: string,
        isBold = false,
    ) => {
        chartContent
            .append("text")
            .attr("x", x)
            .attr("y", yScale(value) - 5)
            .attr("text-anchor", anchor)
            .style("font-size", "10px")
            .style("fill", color)
            .style("font-weight", isBold ? "bold" : "normal")
            .text(`${label}: ${value.toFixed(1)}`)
    }

    const findClosestPoint = (
        data: DataPoint[],
        x0: number,
        bisectX: d3.Bisector<DataPoint, number>,
    ): DataPoint | null => {
        if (data.length === 0) return null

        const i = bisectX.center(data, x0, 1)
        const d0 = data[i - 1]
        const d1 = data[i]

        if (d0 && d1) return x0 - d0.x > d1.x - x0 ? d1 : d0
        return d0 || d1 || null
    }


    const activeDatasets = datasets.filter((dataset) => dataset.data.length > 0)
    const visibleDatasets = activeDatasets.filter((dataset) => visibleLines[dataset.key as keyof typeof visibleLines])
    const allData = activeDatasets.flatMap((dataset) => dataset.data)

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return

        let panTimeout: NodeJS.Timeout | null = null

        // ResizeObserver for responsive behavior
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect
                if (width > 0 && height > 0) {
                    setTimeout(() => renderChart(), 50)
                }
            }
        })

        const renderChart = () => {
            const containerRect = containerRef.current!.getBoundingClientRect()
            const width = containerRect.width
            const height = containerRect.height

            if (width <= 0 || height <= 0) return

            const innerWidth = width - margin.left - margin.right
            const innerHeight = height - margin.top - margin.bottom

            // Calculate data domain from all available data
            const xExtent = d3.extent(allData, (d) => d.x) as [number, number]
            const yExtent = d3.extent(allData, (d) => d.y) as [number, number]
            const yPadding = (yExtent[1] - yExtent[0]) * 0.1
            const yDomain: [number, number] = [yExtent[0] === 0 ? 0 : yExtent[0] - yPadding, yExtent[1] + yPadding]

            //Set up SVG element
            const svgElement = svgRef.current
            if (!svgElement) return
            const svg = d3.select(svgElement)
            svg.selectAll("*").remove()
            svg.attr("width", width).attr("height", height)

            // Create scales
            const xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth])
            const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0])

            // Track current transform and panning state
            let currentTransform = zoomTransformRef.current
            let isPanning = false

            // Create zoom behavior (only horizontal)
            const zoom = d3
                .zoom<SVGSVGElement, unknown>()
                .scaleExtent([1, 10])
                .translateExtent([
                    [0, 0],
                    [width, height],
                ])
                .extent([
                    [0, 0],
                    [width, height],
                ])
                .on("zoom", (event) => {
                    currentTransform = event.transform
                    zoomTransformRef.current = event.transform

                    // Detect if we're panning
                    if (event.sourceEvent && (event.sourceEvent.type === "mousemove" || event.sourceEvent.type === "touchmove")) {
                        isPanning = true

                        // Hide tooltip during panning
                        d3.selectAll(".chart-tooltip-persistent").style("opacity", 0).style("visibility", "hidden")
                        svg.selectAll(".hover-dot").remove()

                        // Clear existing timeout
                        if (panTimeout) clearTimeout(panTimeout)

                        // Set timeout to detect end of panning
                        panTimeout = setTimeout(() => {
                            isPanning = false
                        }, 150)
                    }

                    // Update axes
                    const newXScale = currentTransform.rescaleX(xScale)
                    svg.select<SVGGElement>(".x-axis").call(d3.axisBottom(newXScale))

                    // Update lines
                    const lineGenerator = d3
                        .line<DataPoint>()
                        .x((d) => newXScale(d.x))
                        .y((d) => yScale(d.y))
                        .curve(d3.curveMonotoneX)

                    visibleDatasets.forEach((dataset) => {
                        svg.select(`.${dataset.key}`).attr("d", lineGenerator(dataset.data))
                    })

                    // Update hover dots with transformed scale (only if not panning)
                    if (!isPanning) {
                        svg.selectAll(".hover-dot").attr("cx", (d: any) => newXScale(d.x))
                    }
                })

            svg.call(zoom)

            // Restore the previous zoom transform
            if (zoomTransformRef.current && zoomTransformRef.current.k !== 1) {
                svg.call(zoom.transform, zoomTransformRef.current)
            }

            // Create main group
            const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

            // Add clipping path
            svg
                .append("defs")
                .append("clipPath")
                .attr("id", "chart-clip")
                .append("rect")
                .attr("width", innerWidth)
                .attr("height", innerHeight)

            // Add axes
            const initialXScale = currentTransform.rescaleX(xScale)
            g.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${innerHeight})`)
                .call(d3.axisBottom(initialXScale))
            g.append("g").attr("class", "y-axis").call(d3.axisLeft(yScale))

            // Add axis labels
            const axisLabels = [
                { x: width / 2, y: height - 1, text: "Frames" },
                { x: -height / 2, y: 10, text: "Intensity (aud)", transform: "rotate(-90)" },
            ]

            axisLabels.forEach((label) => {
                const text = svg
                    .append("text")
                    .attr("x", label.x)
                    .attr("y", label.y)
                    .attr("text-anchor", "middle")
                    .style("font-size", "12px")
                    .style("font-weight", "500")
                    .style("fill", "#666")
                    .text(label.text)
                if (label.transform) text.attr("transform", label.transform)
            })
            const chartContent = g.append("g").attr("clip-path", "url(#chart-clip)")

            // Create line generator
            const lineGenerator = d3
                .line<DataPoint>()
                .x((d) => initialXScale(d.x))
                .y((d) => yScale(d.y))
                .curve(d3.curveMonotoneX)

            visibleDatasets.forEach((dataset, index) => {
                const stats = getStatistics(dataset.data)
                const isShowingStats = showStats[dataset.key as keyof typeof showStats]

                // Add statistics lines
                if (isShowingStats) {
                    const statConfigs = [
                        { value: stats.min, dashArray: "3,3", strokeWidth: 1, label: "Min" },
                        { value: stats.max, dashArray: "3,3", strokeWidth: 1, label: "Max" },
                        { value: stats.avg, dashArray: "5,5", strokeWidth: 2, label: "Avg" },
                    ]

                    statConfigs.forEach((config) => {
                        createStatLine(
                            chartContent,
                            yScale,
                            innerWidth,
                            config.value,
                            dataset.color,
                            config.dashArray,
                            config.strokeWidth,
                            `stat-line-${config.label.toLowerCase()}-${index + 1}`,
                        )

                        createStatLabel(
                            chartContent,
                            yScale,
                            index === 0 ? innerWidth - 5 : 5,
                            config.value,
                            dataset.color,
                            index === 0 ? "end" : "start",
                            config.label,
                            config.label === "Avg",
                        )
                    })
                }

                chartContent
                    .append("path")
                    .datum(dataset.data)
                    .attr("class", dataset.key)
                    .attr("fill", "none")
                    .attr("stroke", dataset.color)
                    .attr("stroke-width", 2)
                    .attr("d", lineGenerator)
            })

            // Create tooltip
            const tooltip = d3
                .select("body")
                .selectAll(".chart-tooltip-persistent")
                .data([null])
                .join("div")
                .attr("class", "chart-tooltip-persistent")
                .style("position", "absolute")
                .style("background", "rgba(0, 0, 0, 0.9)")
                .style("color", "white")
                .style("padding", "12px")
                .style("border-radius", "6px")
                .style("font-size", "14px")
                .style("pointer-events", "none")
                .style("z-index", "1000")
                .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)")
                .style("opacity", 0)
                .style("visibility", "hidden")
                .style("top", "0px")

            // Create overlay for hover detection
            const overlay = g
                .append("rect")
                .attr("class", "overlay")
                .attr("width", innerWidth)
                .attr("height", innerHeight)
                .attr("fill", "none")
                .style("pointer-events", "all")

            let lastDataState: string | null = null
            const bisectX = d3.bisector((d: DataPoint) => d.x)

            overlay
                .on("mousemove", (event) => {
                    if (isPanning) return

                    const [mouseX] = d3.pointer(event)
                    const currentXScale = currentTransform.rescaleX(xScale)
                    const x0 = currentXScale.invert(mouseX)

                    const dotsData: Array<{ x: number; y: number; color: string; line: string }> = []

                    let tooltipContent = ""

                    visibleDatasets.forEach((dataset) => {
                        const point = findClosestPoint(dataset.data, x0, bisectX)
                        if (point) {
                            dotsData.push({ x: point.x, y: point.y, color: dataset.color, line: dataset.name })
                            tooltipContent += `<div style="margin-bottom: 12px;"><strong style="color: ${dataset.color};">${dataset.name}</strong><br/>Frame: ${point.x} Intensity: ${point.y.toFixed(2)}</div>`
                        }
                    })

                    const currentDataState = dotsData.map((d) => `${d.line}-${d.x}-${d.y}`).join("|")

                    if (currentDataState !== lastDataState) {
                        lastDataState = currentDataState

                        const dots = chartContent.selectAll(".hover-dot").data(dotsData)

                        dots.exit().remove()

                        dots
                            .enter()
                            .append("circle")
                            .attr("class", "hover-dot")
                            .attr("r", 5)
                            .attr("stroke", "white")
                            .attr("stroke-width", 2)
                            .style("pointer-events", "none")
                            .merge(dots as any)
                            .attr("cx", (d) => currentXScale(d.x))
                            .attr("cy", (d) => yScale(d.y))
                            .attr("fill", (d) => d.color)

                        if (dotsData.length > 0) {
                            tooltip.html(tooltipContent).style("visibility", "visible").style("opacity", 1)
                        } else {
                            tooltip.style("opacity", 0).style("visibility", "hidden")
                        }
                    }

                    if (dotsData.length > 0) {
                        const tooltipNode = tooltip.node() as HTMLElement
                        if (tooltipNode) {
                            const tooltipRect = tooltipNode.getBoundingClientRect()

                            let left = event.pageX + 15
                            let top = event.pageY - 15

                            if (left + tooltipRect.width > window.innerWidth) {
                                left = event.pageX - tooltipRect.width - 15
                            }
                            if (top < 0) {
                                top = event.pageY + 15
                            }

                            tooltip.style("left", left + "px").style("top", top + "px")
                        }
                    }
                })
                .on("mouseleave", () => {
                    lastDataState = null
                    chartContent.selectAll(".hover-dot").remove()
                    tooltip.style("opacity", 0).style("visibility", "hidden")
                })
        }

        // Initial render
        renderChart()

        // Start observing
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        // Cleanup
        return () => {
            resizeObserver.disconnect()
            if (panTimeout) clearTimeout(panTimeout)
            d3.selectAll(".chart-tooltip-persistent").remove()
        }
    }, [allData, visibleLines, showStats])

    const toggleLineVisibility = (lineNumber: 1 | 2) => {
        setVisibleLines((prev) => ({
            ...prev,
            [`line${lineNumber}`]: !prev[`line${lineNumber}` as keyof typeof prev],
        }))
    }

    const toggleStats = (lineNumber: 1 | 2) => {
        setShowStats((prev) => ({
            ...prev,
            [`line${lineNumber}`]: !prev[`line${lineNumber}` as keyof typeof prev],
        }))
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="mb-4 flex-shrink-0 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Frame Intensities by Frame</h2>

                {/* Legend on the right */}
                <TooltipProvider>
                    <div className="flex gap-2 items-center">
                        {activeDatasets.map((dataset, index) => {
                            const lineNumber = (index + 1) as 1 | 2
                            const isVisible = visibleLines[dataset.key as keyof typeof visibleLines]
                            const showStatsActive = showStats[dataset.key as keyof typeof showStats]

                            return (
                                <div key={dataset.key} className="flex items-center">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={`flex items-center gap-1 h-7 px-2 py-0 text-xs rounded-r-none border-r-0 ${!isVisible ? "opacity-50" : ""
                                                    }`}
                                                onClick={() => toggleLineVisibility(lineNumber)}
                                            >
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{
                                                        backgroundColor: isVisible ? dataset.color : "#d1d5db",
                                                    }}
                                                />
                                                <span className="font-medium">
                                                    {dataset.config?.col},{dataset.config?.row}
                                                </span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Toggle {dataset.name} visibility</p>
                                        </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={`h-7 px-1 py-0 rounded-l-none ${!isVisible ? "opacity-50 cursor-not-allowed" : showStatsActive ? "bg-gray-100" : ""
                                                    }`}
                                                onClick={() => toggleStats(lineNumber)}
                                                disabled={!isVisible}
                                            >
                                                <BarChart3 size={12} />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Toggle {dataset.name} statistics</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            )
                        })}
                    </div>
                </TooltipProvider>
            </div>
            {/* Chart */}
            <div ref={containerRef} className="flex-1 min-h-0">
                <svg ref={svgRef} className="w-full h-full" />
            </div>
        </div >
    )
}

export default D3LineChart
