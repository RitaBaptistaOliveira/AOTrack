"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import type { D3LineChartProps } from "@/types/line"
import { Eye, EyeOff, TrendingUp, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const Histogram: React.FC<D3LineChartProps> = ({ data1 = [], data2 = [], config1, config2 }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const [visibleLines, setVisibleLines] = useState({ line1: true, line2: true })
  const [showKDE, setShowKDE] = useState({ line1: false, line2: false })
  const [showStats, setShowStats] = useState({ line1: false, line2: false })
  const [binCount, setBinCount] = useState(30)
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)

  const margin = { top: 20, right: 30, bottom: 60, left: 80 }
  const colors = ["#3b82f6", "#ef4444"]

  const datasets = [
    { data: data1, config: config1, key: "line1", color: colors[0], name: "Line 1" },
    { data: data2, config: config2, key: "line2", color: colors[1], name: "Line 2" },
  ] as const

  // Determine what should be rendered
  const activeDatasets = datasets.filter((dataset) => dataset.data.length > 0)
  const allData = activeDatasets.flatMap((dataset) => dataset.data)

  // Kernel Density Estimation functions
  const kernelEpanechnikov = (bandwidth: number) => {
    return (v: number) => {
      return Math.abs((v /= bandwidth)) <= 1 ? (0.75 * (1 - v * v)) / bandwidth : 0
    }
  }

  const kernelDensityEstimator = (kernel: (v: number) => number, xValues: number[]) => {
    return (sample: number[]) => {
      return xValues.map((x) => ({
        x,
        y: d3.mean(sample, (v) => kernel(x - v))!,
      }))
    }
  }

  const generateKDE = (data: number[], domain: [number, number], yMax: number) => {
    const [xStart, xEnd] = domain
    const xValues = d3.range(xStart, xEnd, (xEnd - xStart) / 100)
    const bandwidth = (xEnd - xStart) * 0.1
    const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), xValues)
    const rawKDE = kde(data)
    const scaleFactor = yMax / (d3.max(rawKDE, (d) => d.y) || 1)
    return rawKDE.map((d) => ({ x: d.x, y: Math.max(0, d.y * scaleFactor) }))
  }

  const calculateStatistics = (data: number[]) => {
    if (data.length === 0) return { mean: 0, median: 0, mode: 0 }

    // Mean
    const mean = d3.mean(data) || 0

    // Median
    const sorted = [...data].sort((a, b) => a - b)
    const median = d3.median(sorted) || 0

    // Mode (most frequent value or approximate mode for continuous data)
    const histogram = d3
      .histogram<number, number>()
      .domain(d3.extent(data) as [number, number])
      .thresholds(20)
    const bins = histogram(data)
    const maxBin = bins.reduce((max, bin) => (bin.length > max.length ? bin : max), bins[0])
    const mode = maxBin ? (maxBin.x0! + maxBin.x1!) / 2 : 0

    return { mean, median, mode }
  }

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || allData.length === 0) return

    let panTimeout: NodeJS.Timeout | null = null

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setTimeout(() => renderHistogram(), 50)
        }
      }
    })

    const renderHistogram = () => {
      const containerRect = containerRef.current!.getBoundingClientRect()
      const width = containerRect.width
      const height = containerRect.height

      if (width <= 0 || height <= 0) return

      const innerWidth = width - margin.left - margin.right
      const innerHeight = height - margin.top - margin.bottom

      // Setup SVG
      const svgElement = svgRef.current
      if (!svgElement) return
      const svg = d3.select(svgElement)
      svg.selectAll("*").remove()
      svg.attr("width", width).attr("height", height)

      // Create main group
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

      // Get all intensity values from all active datasets (not just visible ones)
      const allIntensities = activeDatasets.flatMap((dataset) => dataset.data.map((d) => d.y))

      if (allIntensities.length === 0) return

      // Create scales
      const xExtent = d3.extent(allIntensities) as [number, number]
      const xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth])

      // Create histogram generator
      const histogram = d3
        .histogram<number, number>()
        .domain(xScale.domain() as [number, number])
        .thresholds(binCount)

      // Generate bins for each active dataset
      const datasetBins = activeDatasets.map((dataset) => {
        const intensities = dataset.data.map((d) => d.y)
        const bins = histogram(intensities)
        return { dataset, bins }
      })

      // Find max count for y scale
      const maxCount =
        d3.max(
          datasetBins.flatMap((d) => d.bins),
          (d) => d.length,
        ) || 0

      const yScale = d3.scaleLinear().domain([0, maxCount]).range([innerHeight, 0])

      // Calculate statistics for each dataset
      const datasetStats = activeDatasets.map((dataset) => ({
        dataset,
        stats: calculateStatistics(dataset.data.map((d) => d.y)),
      }))

      // Create tooltip
      const tooltip = d3
        .select("body")
        .selectAll(".histogram-tooltip-persistent")
        .data([null])
        .join("div")
        .attr("class", "histogram-tooltip-persistent")
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

      // Create clipping path
      svg
        .append("defs")
        .append("clipPath")
        .attr("id", "histogram-clip")
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)

      // Create chart content group (MOVE THIS HERE)
      const chartContent = g.append("g").attr("clip-path", "url(#histogram-clip)")

      // Add axes
      const initialXScale = zoomTransformRef.current.rescaleX(xScale)

      g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(initialXScale))

      g.append("g").attr("class", "y-axis").call(d3.axisLeft(yScale))

      // Draw statistics lines for visible datasets (NOW THIS WILL WORK)
      datasetStats.forEach(({ dataset, stats }) => {
        if (
          visibleLines[dataset.key as keyof typeof visibleLines] &&
          showStats[dataset.key as keyof typeof showStats]
        ) {
          const statConfigs = [
            { value: stats.mean, label: "Mean", dashArray: "none", strokeWidth: 2, opacity: 0.8 },
            { value: stats.median, label: "Median", dashArray: "8,4", strokeWidth: 2, opacity: 0.8 },
            { value: stats.mode, label: "Mode", dashArray: "4,2", strokeWidth: 2, opacity: 0.8 },
          ]

          statConfigs.forEach((config, index) => {
            // Draw vertical line
            chartContent
              .append("line")
              .attr("class", `stat-line-${config.label.toLowerCase()}-${dataset.key}`)
              .attr("x1", initialXScale(config.value))
              .attr("x2", initialXScale(config.value))
              .attr("y1", 0)
              .attr("y2", innerHeight)
              .attr("stroke", dataset.color)
              .attr("stroke-width", config.strokeWidth)
              .attr("stroke-dasharray", config.dashArray)
              .attr("opacity", config.opacity)

            // Add label with better visibility
            chartContent
              .append("text")
              .attr("class", `stat-text-${config.label.toLowerCase()}-${dataset.key}`)
              .attr("x", initialXScale(config.value))
              .attr("y", 15 + index * 15)
              .attr("text-anchor", "middle")
              .style("font-size", "10px")
              .style("fill", "white")
              .style("font-weight", "bold")
              .style("stroke", dataset.color)
              .style("stroke-width", "2px")
              .style("paint-order", "stroke fill")
              .text(`${config.label}: ${config.value.toFixed(1)}`)
          })
        }
      })

      // Generate KDE data for each active dataset
      const kdeData: Array<{ dataset: any; kde: Array<{ x: number; y: number }> }> = []
      activeDatasets.forEach((dataset) => {
        if (dataset.data.length > 0) {
          const intensities = dataset.data.map((d) => d.y)
          const kde = generateKDE(intensities, xExtent, maxCount * 0.8) // Scale to 80% of histogram max
          kdeData.push({ dataset, kde })
        }
      })

      let currentTransform = zoomTransformRef.current
      let localIsPanning = false

      // Create zoom behavior
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

          // Detect panning
          if (event.sourceEvent && (event.sourceEvent.type === "mousemove" || event.sourceEvent.type === "touchmove")) {
            localIsPanning = true
            tooltip.style("opacity", 0).style("visibility", "hidden")

            if (panTimeout) clearTimeout(panTimeout)
            panTimeout = setTimeout(() => {
              localIsPanning = false
            }, 150)
          }

          // Update x scale
          const newXScale = currentTransform.rescaleX(xScale)

          // Update axes
          svg.select<SVGGElement>(".x-axis").call(d3.axisBottom(newXScale))

          // Update bars directly
          datasetBins.forEach(({ dataset, bins }) => {
            svg
              .selectAll(`.bar-${dataset.key}`)
              .attr("x", (d: any) => newXScale(d.x0))
              .attr("width", (d: any) => Math.max(0, newXScale(d.x1) - newXScale(d.x0)))
          })

          // Update KDE curves
          const lineGenerator = d3
            .line<{ x: number; y: number }>()
            .x((d) => newXScale(d.x))
            .y((d) => yScale(d.y))
            .curve(d3.curveCardinal)

          kdeData.forEach(({ dataset, kde }) => {
            svg.select(`.kde-${dataset.key}`).attr("d", lineGenerator(kde))
          })

          // Update statistics lines
          datasetStats.forEach(({ dataset, stats }) => {
            if (
              visibleLines[dataset.key as keyof typeof visibleLines] &&
              showStats[dataset.key as keyof typeof showStats]
            ) {
              const statConfigs = [
                { value: stats.mean, label: "Mean" },
                { value: stats.median, label: "Median" },
                { value: stats.mode, label: "Mode" },
              ]

              statConfigs.forEach((config) => {
                svg
                  .selectAll(`.stat-line-${config.label.toLowerCase()}-${dataset.key}`)
                  .attr("x1", newXScale(config.value))
                  .attr("x2", newXScale(config.value))
              })
            }
          })

          // Update statistics text positions
          datasetStats.forEach(({ dataset, stats }) => {
            if (
              visibleLines[dataset.key as keyof typeof visibleLines] &&
              showStats[dataset.key as keyof typeof showStats]
            ) {
              const statConfigs = [
                { value: stats.mean, label: "Mean" },
                { value: stats.median, label: "Median" },
                { value: stats.mode, label: "Mode" },
              ]

              statConfigs.forEach((config) => {
                svg
                  .selectAll(`.stat-text-${config.label.toLowerCase()}-${dataset.key}`)
                  .attr("x", newXScale(config.value))
              })
            }
          })

          // Update hover areas
          svg
            .selectAll(".hover-area")
            .attr("x", (d: any) => newXScale(d.x0))
            .attr("width", (d: any) => Math.max(0, newXScale(d.x1) - newXScale(d.x0)))
        })

      svg.call(zoom)

      // Restore the previous zoom transform
      if (zoomTransformRef.current && zoomTransformRef.current.k !== 1) {
        svg.call(zoom.transform, zoomTransformRef.current)
      }

      // Add axis labels
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "500")
        .style("fill", "#666")
        .text("Intensity")

      svg
        .append("text")
        .attr("x", -height / 2)
        .attr("y", 12)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .style("font-size", "12px")
        .style("font-weight", "500")
        .style("fill", "#666")
        .text("Count")

      // Draw bars for each dataset (overlapping)
      datasetBins.forEach(({ dataset, bins }) => {
        chartContent
          .selectAll(`.bar-${dataset.key}`)
          .data(bins)
          .enter()
          .append("rect")
          .attr("class", `bar-${dataset.key}`)
          .attr("x", (d) => initialXScale(d.x0!))
          .attr("y", (d) => yScale(d.length))
          .attr("width", (d) => Math.max(0, initialXScale(d.x1!) - initialXScale(d.x0!)))
          .attr("height", (d) => innerHeight - yScale(d.length))
          .attr("fill", dataset.color)
          .attr("opacity", 0.6)
          .attr("stroke", dataset.color)
          .attr("stroke-width", 0.5)
          .style("display", visibleLines[dataset.key as keyof typeof visibleLines] ? "block" : "none")
      })

      // Draw KDE curves
      const lineGenerator = d3
        .line<{ x: number; y: number }>()
        .x((d) => initialXScale(d.x))
        .y((d) => yScale(d.y))
        .curve(d3.curveCardinal)

      kdeData.forEach(({ dataset, kde }) => {
        chartContent
          .append("path")
          .datum(kde)
          .attr("class", `kde-${dataset.key}`)
          .attr("fill", "none")
          .attr("stroke", dataset.color)
          .attr("stroke-width", 2)
          .attr("opacity", 0.8)
          .attr("d", lineGenerator)
          .style(
            "display",
            visibleLines[dataset.key as keyof typeof visibleLines] && showKDE[dataset.key as keyof typeof showKDE]
              ? "block"
              : "none",
          )
      })

      // Create invisible overlay rectangles for hover detection
      const allBinRanges = new Map<string, { x0: number; x1: number; datasets: Array<{ dataset: any; bin: any }> }>()

      // Collect all unique bin ranges and their associated datasets
      datasetBins.forEach(({ dataset, bins }) => {
        if (visibleLines[dataset.key as keyof typeof visibleLines]) {
          bins.forEach((bin) => {
            const key = `${bin.x0}-${bin.x1}`
            if (!allBinRanges.has(key)) {
              allBinRanges.set(key, { x0: bin.x0!, x1: bin.x1!, datasets: [] })
            }
            allBinRanges.get(key)!.datasets.push({ dataset, bin })
          })
        }
      })

      // Create hover areas for each unique bin range
      chartContent
        .selectAll(".hover-area")
        .data(Array.from(allBinRanges.values()))
        .enter()
        .append("rect")
        .attr("class", "hover-area")
        .attr("x", (d) => initialXScale(d.x0))
        .attr("y", 0)
        .attr("width", (d) => Math.max(0, initialXScale(d.x1) - initialXScale(d.x0)))
        .attr("height", innerHeight)
        .attr("fill", "transparent")
        .attr("pointer-events", "all")
        .on("mouseover", (event, d) => {
          if (localIsPanning) return

          // Filter to only show datasets that have count > 0 in this bin
          const datasetsWithData = d.datasets.filter(({ bin }) => bin.length > 0)

          if (datasetsWithData.length === 0) return

          // Build tooltip content for datasets with data in this bin range
          let tooltipContent = `<div style="margin-bottom: 8px;"><strong>Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}</strong></div>`

          datasetsWithData.forEach(({ dataset, bin }) => {
            tooltipContent += `<div style="margin-bottom: 6px;"><strong style="color: ${dataset.color};">${dataset.name}</strong><br/>Count: ${bin.length}</div>`
          })

          tooltip.style("visibility", "visible").style("opacity", 1).html(tooltipContent)

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
        })
        .on("mousemove", (event, d) => {
          if (localIsPanning) return

          const tooltipNode = tooltip.node() as HTMLElement
          if (tooltipNode && tooltip.style("opacity") !== "0") {
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
        })
        .on("mouseleave", () => {
          tooltip.style("opacity", 0).style("visibility", "hidden")
        })
    }

    renderHistogram()

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
      if (panTimeout) clearTimeout(panTimeout)
      d3.selectAll(".histogram-tooltip-persistent").remove()
    }
  }, [allData, visibleLines, showKDE, showStats, binCount])

  const toggleLineVisibility = (lineNumber: 1 | 2) => {
    setVisibleLines((prev) => ({
      ...prev,
      [`line${lineNumber}`]: !prev[`line${lineNumber}` as keyof typeof prev],
    }))
  }

  const toggleKDE = (lineNumber: 1 | 2) => {
    setShowKDE((prev) => ({
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
      {/* Chart Title and Controls */}
      <div className="mb-4 flex-shrink-0 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Intensity Distribution</h2>

        <div className="flex items-center gap-4">
          {/* Bin Count Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Bins:</span>
            <Select value={binCount.toString()} onValueChange={(value) => setBinCount(Number.parseInt(value))}>
              <SelectTrigger className="w-16 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 15, 20, 25, 30, 35, 40, 45, 50].map((count) => (
                  <SelectItem key={count} value={count.toString()}>
                    {count}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Legend */}
          {activeDatasets.length > 0 && (
            <div className="flex gap-2 items-center">
              {activeDatasets.map((dataset, index) => (
                <div key={dataset.key} className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 h-7 px-2 text-xs"
                    onClick={() => toggleLineVisibility((index + 1) as 1 | 2)}
                    title={`Toggle ${dataset.name} visibility`}
                  >
                    {visibleLines[dataset.key as keyof typeof visibleLines] ? <Eye size={12} /> : <EyeOff size={12} />}
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: visibleLines[dataset.key as keyof typeof visibleLines]
                          ? dataset.color
                          : "#d1d5db",
                        opacity: visibleLines[dataset.key as keyof typeof visibleLines] ? 1 : 0.5,
                      }}
                    />
                    <span
                      className={`text-xs font-medium ${
                        visibleLines[dataset.key as keyof typeof visibleLines] ? "" : "text-muted-foreground"
                      }`}
                    >
                      {dataset.config?.col},{dataset.config?.row}
                    </span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => toggleKDE((index + 1) as 1 | 2)}
                    disabled={!visibleLines[dataset.key as keyof typeof visibleLines]}
                    title={`Toggle ${dataset.name} KDE curve`}
                  >
                    <TrendingUp
                      size={12}
                      className={
                        showKDE[dataset.key as keyof typeof showKDE] ? "text-primary" : "text-muted-foreground"
                      }
                    />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => toggleStats((index + 1) as 1 | 2)}
                    disabled={!visibleLines[dataset.key as keyof typeof visibleLines]}
                    title={`Toggle ${dataset.name} statistics`}
                  >
                    <BarChart3
                      size={12}
                      className={
                        showStats[dataset.key as keyof typeof showStats] ? "text-primary" : "text-muted-foreground"
                      }
                    />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div ref={containerRef} className="flex-1 min-h-0">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  )
}

export default Histogram
