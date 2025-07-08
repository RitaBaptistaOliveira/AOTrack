"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import type { LineChartProps2D } from "@/types/line"
import { TrendingUp, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import { Input } from "../ui/input"

const DualHistogram: React.FC<LineChartProps2D> = ({ data1X = [], data1Y = [], data2X = [], data2Y = [], config1, config2}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const [visibleLines, setVisibleLines] = useState({ line1: true, line2: true })
  const [showKDE, setShowKDE] = useState({ line1: false, line2: false })
  const [showStats, setShowStats] = useState({ line1: false, line2: false })
  const [binCount, setBinCount] = useState(30)
  const [binsRange, setBinsRange] = useState([5, 100])
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)

  const margin = { top: 5, right: 10, bottom: 40, left: 40 }

  const colors = ["#3b82f6", "#009E73", "#ef4444", "#F0E442"]

  const datasets = [
    { data: data1X, config: config1, key: "line1", color: colors[0], name: "X" },
    { data: data1Y, config: config1, key: "line1", color: colors[1], name: "Y" },
    { data: data2X, config: config2, key: "line2", color: colors[2], name: "X" },
    { data: data2Y, config: config2, key: "line2", color: colors[3], name: "Y" },
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
    const lengths = [data1X.length, data2X.length].filter(len => len > 0)

    if (lengths.length === 0) {
      setBinsRange([5, 20])
      return
    }
    const baseLength = Math.max(...lengths)
    const min = Math.max(5, Math.floor(Math.log2(baseLength)))
    const max = Math.min(200, Math.floor(Math.sqrt(baseLength) * 2))
    setBinsRange(prev => {
      if (prev[0] !== min || prev[1] !== max) return [min, max]
      return prev
    })
  }, [data1X.length, data2X.length])

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
        .style("top", "0px")

      // Create clipping path
      svg
        .append("defs")
        .append("clipPath")
        .attr("id", "histogram-clip")
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)

      // Create chart content group
      const chartContent = g.append("g").attr("clip-path", "url(#histogram-clip)")

      // Add axes
      const initialXScale = zoomTransformRef.current.rescaleX(xScale)

      g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(initialXScale))

      g.append("g").attr("class", "y-axis").call(d3.axisLeft(yScale))

      // Draw statistics lines for visible datasets
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
              .attr("class", `stat-line-${config.label.toLowerCase()}-${dataset.key}-${dataset.name}`)
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
              .attr("class", `stat-text-${config.label.toLowerCase()}-${dataset.key}-${dataset.name}`)
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
          datasetBins.forEach(({ dataset }) => {
            svg
              .selectAll(`.bar-${dataset.key}-${dataset.name}`)
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
            svg.select(`.kde-${dataset.key}-${dataset.name}`).attr("d", lineGenerator(kde))
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
                  .selectAll(`.stat-line-${config.label.toLowerCase()}-${dataset.key}-${dataset.name}`)
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
                  .selectAll(`.stat-text-${config.label.toLowerCase()}-${dataset.key}-${dataset.name}`)
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
        .text("Measurement Value")

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
          .selectAll(`.bar-${dataset.key}-${dataset.name}`)
          .data(bins)
          .enter()
          .append("rect")
          .attr("class", `bar-${dataset.key}-${dataset.name}`)
          .attr("x", (d) => initialXScale(d.x0!))
          .attr("y", (d) => yScale(d.length))
          .attr("width", (d) => Math.max(0, initialXScale(d.x1!) - initialXScale(d.x0!)))
          .attr("height", (d) => innerHeight - yScale(d.length))
          .attr("fill", dataset.color)
          .attr("opacity", 0.5)
          .attr("stroke", dataset.color)
          .attr("stroke-width", 0.5)
          .style("mix-blend-mode", "overlay")
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
          .attr("class", `kde-${dataset.key}-${dataset.name}`)
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

      // Helper function to highlight bars
      const highlightBars = (binRange: { x0: number; x1: number; datasets: Array<{ dataset: any; bin: any }> }) => {
        binRange.datasets.forEach(({ dataset }) => {
          svg
            .selectAll(`.bar-${dataset.key}-${dataset.name}`)
            .filter((d: any) => d.x0 === binRange.x0 && d.x1 === binRange.x1)
            .attr("opacity", 0.8)
            .attr("stroke-width", 2)
        });
      }

      // Helper function to reset bar highlighting
      const resetBarHighlight = () => {
        datasetBins.forEach(({ dataset }) => {
          svg.selectAll(`.bar-${dataset.key}-${dataset.name}`).attr("opacity", 0.5).attr("stroke-width", 0.5)
        })
      }

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

          highlightBars(d)

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

            // Check if tooltip would go off the right edge
            if (left + tooltipRect.width > window.innerWidth) {
              left = event.pageX - tooltipRect.width - 15
            }

            // Check if tooltip would go off the bottom edge
            if (top + tooltipRect.height > window.innerHeight) {
              top = event.pageY - tooltipRect.height + 15
            }

            // Check if tooltip would go off the top edge
            if (top < 0) {
              top = event.pageY + 15
            }

            tooltip.style("left", left + "px").style("top", top + "px")
          }
        })
        .on("mousemove", (event) => {
          if (localIsPanning) return

          const tooltipNode = tooltip.node() as HTMLElement
          if (tooltipNode && tooltip.style("opacity") !== "0") {
            const tooltipRect = tooltipNode.getBoundingClientRect()
            let left = event.pageX + 15
            let top = event.pageY - 15

            if (left + tooltipRect.width > window.innerWidth) {
              left = event.pageX - tooltipRect.width - 15
            }

            if (top + tooltipRect.height > window.innerHeight) {
              top = event.pageY - tooltipRect.height + 15
            }

            if (top < 0) {
              top = event.pageY + 15
            }

            tooltip.style("left", left + "px").style("top", top + "px")
          }
        })
        .on("mouseleave", () => {
          tooltip.style("opacity", 0).style("visibility", "hidden")
          resetBarHighlight()
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
        <h2 className="text-lg font-semibold">Measurement Distribution</h2>

        <div className="flex items-center gap-4">

          <TooltipProvider>
            <div className="flex gap-2 items-center">
              {Object.entries(activeDatasets.reduce((acc, d) => {
                if (!acc[d.key]) acc[d.key] = [];
                acc[d.key].push(d);
                return acc;
              }, {} as Record<string, typeof activeDatasets>)
              ).map(([key, group], index) => {
                const lineNumber = (index < 2 ? 1 : 2) as 1 | 2
                const isVisible = visibleLines[key as keyof typeof visibleLines]
                const showStatsActive = showStats[key as keyof typeof showStats]
                const showKDEActive = showKDE[key as keyof typeof showKDE]
                return (
                  <div key={key} className="flex items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`flex items-center gap-1 h-7 px-2 py-0 text-xs rounded-r-none border-r-0 ${!isVisible ? "opacity-50" : ""
                            }`}
                          onClick={() => toggleLineVisibility(lineNumber)}
                        >
                          {group.map((d) => (
                            <div key={key + d.name}>
                              {d.name}
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: isVisible ? d.color : "#d1d5db" }}
                              />
                            </div>

                          ))}
                          <span className="font-medium">
                            ({group[0].config?.col},{group[0].config?.row})
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Toggle Cell({group[0].config?.col},{group[0].config?.row}) visibility</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-7 px-1 py-0 rounded-none ${!isVisible ? "opacity-50 cursor-not-allowed" : showKDEActive ? "bg-gray-100" : ""
                            }`}
                          onClick={() => toggleKDE(lineNumber)}
                          disabled={!visibleLines[key as keyof typeof visibleLines]}
                        >
                          <TrendingUp
                            size={12}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Toggle KDE curve</p>
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
                          disabled={!visibleLines[key as keyof typeof visibleLines]}
                        >
                          <BarChart3
                            size={12}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Toggle statistics</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1 pl-2">
          <span className="text-sm font-medium">Bins:</span>
          <Input
            type="number"
            className="h-7 w-auto text-xs text-center px-1"
            value={binCount}
            min={binsRange[0]}
            max={binsRange[1]}
            onChange={(e) => {
              const raw = Number(e.target.value)
              const clamped = Math.min(binsRange[1], Math.max(binsRange[0], raw))
              setBinCount(clamped)
            }}
            style={{ width: `${Math.max(binCount.toString().length, 2) + 3}ch` }}
          />
        </div>
      </div>


      {/* Chart area */}
      <div ref={containerRef} className="flex-1 min-h-0">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  )
}

export default DualHistogram
