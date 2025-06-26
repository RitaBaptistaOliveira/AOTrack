import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { createPortal } from "react-dom"

interface HistogramChartProps {
    bins: [number[], number[]]
    counts: [number[], number[]]
    numBins: number
    domain: [number, number]
    selectedPoint?: {
        bins: [number[], number[]]
        counts: [number[], number[]]
    }
    onChangeNumBins: (bins: number) => void
}

export default function DualHistogramChart({ bins, counts, numBins, domain, selectedPoint, onChangeNumBins }: HistogramChartProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const svgRef = useRef<SVGSVGElement | null>(null)
    const [size, setSize] = useState({ width: 0, height: 0 })
    const [hoverInfo, setHoverInfo] = useState<null | {
        type: 'bar' | 'curve' | 'mean' | 'median' | 'mode'
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
        onChangeNumBins(numBins)
    }, [numBins])

    function kernelEpanechnikov(k: number) {
        return function (v: number) {
            return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
        };
    }

    function kernelDensityEstimator(kernel: (v: number) => number, xValues: number[]) {
        return function (sample: number[]) {
            return xValues.map(x => ({
                x,
                y: d3.mean(sample, v => kernel(x - v))!
            }));
        };
    }

    function generateKDE(data: number[], domain: [number, number], yMax: number) {
        const [xStart, xEnd] = domain;
        const xValues = d3.range(xStart, xEnd, (xEnd - xStart) / 100);
        const bandwidth = (xEnd - xStart) * 0.1;
        const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), xValues);
        const rawKDE = kde(data);
        const scaleFactor = yMax / (d3.max(rawKDE, d => d.y) || 1);

        const scaledKDE = rawKDE.map(d => ({ x: d.x, y: Math.max(0, d.y * scaleFactor) }));

        const mean = d3.mean(data)!;
        const median = d3.median(data)!;
        const mode = scaledKDE.reduce((a, b) => (a.y > b.y ? a : b)).x;

        return { lineData: scaledKDE, mean, median, mode };
    }

    function getYAtX(lineData: { x: number; y: number }[], targetX: number): number {
        for (let i = 1; i < lineData.length; i++) {
            const prev = lineData[i - 1];
            const curr = lineData[i];
            if (curr.x >= targetX) {
                const t = (targetX - prev.x) / (curr.x - prev.x);
                return prev.y + t * (curr.y - prev.y);
            }
        }
        return lineData[lineData.length - 1]?.y || 0;
    }

    useEffect(() => {
        console.log("HIST DRAW")

        if (!svgRef.current || bins.length < 2 || counts[0].length === 0 || counts[1].length === 0 || size.width === 0 || size.height === 0) return

        const margin = { top: 20, right: 20, bottom: 40, left: 40 }
        const width = size.width - margin.left - margin.right
        const height = size.height - margin.top - margin.bottom

        const svg = d3.select(svgRef.current)
        svg.selectAll("*").remove()
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

        const chartContent = g.append("g")

        const binDataX = counts[0].map((count, i) => ({
            x0: bins[0][i],
            x1: bins[0][i + 1],
            count
        }))

        const binDataY = counts[1].map((count, i) => ({
            x0: bins[1][i],
            x1: bins[1][i + 1],
            count
        }))
        console.log(selectedPoint)
        const binDataPoint1X = selectedPoint?.counts?.[0].map((count, i) => ({
            x0: selectedPoint.bins?.[0][i],
            x1: selectedPoint.bins?.[0][i + 1],
            count
        }))
        console.log(binDataPoint1X)
        const binDataPoint1Y = selectedPoint?.counts?.[1].map((count, i) => ({
            x0: selectedPoint.bins?.[1][i],
            x1: selectedPoint.bins?.[1][i + 1],
            count
        }))
        const allBins = [...binDataX, ...binDataY, ...(binDataPoint1X ?? []), ...(binDataPoint1Y ?? [])]
        const yMax = d3.max(allBins, b => b.count) ?? 1

        const xScale = d3.scaleLinear().domain(domain).range([0, width])
        const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0])

        const xAxis = svg.append("g").attr("transform", `translate(${margin.left},${height + margin.top})`).attr("class", "x-axis").call(d3.axisBottom(xScale));
        svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`).attr("class", "y-axis").call(d3.axisLeft(yScale));

        const line = d3.line<{ x: number, y: number }>()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))

        chartContent.selectAll("hist")
            .data(binDataX)
            .enter()
            .append("rect")
            .attr("class", "hist")
            .attr("x", d => xScale(d.x0))
            .attr("width", d => xScale(d.x1) - xScale(d.x0))
            .attr("y", d => yScale(d.count))
            .attr("height", d => height - yScale(d.count))
            .attr("fill", "steelblue")
            .attr("opacity", 0.6)
            .on("mousemove", function (event, d) {
                d3.select(this).attr('style', 'fill: orange;');
                setHoverInfo({
                    type: 'bar',
                    value: d,
                    x: event.clientX,
                    y: event.clientY,
                })
            })
            .on("mouseleave", function () {
                d3.select(this).attr('style', 'fill: steelblue;');
                setHoverInfo(null)
            })

        chartContent.selectAll("hist")
            .data(binDataY)
            .enter()
            .append("rect")
            .attr("class", "hist")
            .attr("x", d => xScale(d.x0))
            .attr("width", d => xScale(d.x1) - xScale(d.x0))
            .attr("y", d => yScale(d.count))
            .attr("height", d => height - yScale(d.count))
            .attr("fill", "deepskyblue")
            .attr("opacity", 0.6)
            .on("mousemove", function (event, d) {
                d3.select(this).attr('style', 'fill: orange;');
                setHoverInfo({
                    type: 'bar',
                    value: d,
                    x: event.clientX,
                    y: event.clientY,
                })
            })
            .on("mouseleave", function () {
                d3.select(this).attr('style', 'fill: deepskyblue;');
                setHoverInfo(null)
            })

        const xVals = generateKDE(
            counts[0].flatMap((count, i) => Array(count).fill((bins[0][i] + bins[0][i + 1]) / 2)),
            domain,
            yMax
        );

        const yVals = generateKDE(
            counts[1].flatMap((count, i) => Array(count).fill((bins[1][i] + bins[1][i + 1]) / 2)),
            domain,
            yMax
        );

        chartContent.append("path")
            .datum(xVals.lineData)
            .attr("class", "density-curve")
            .attr("fill", "none")
            .attr("stroke", "purple")
            .attr("stroke-width", 2)
            .attr("d", line)
            .on("mousemove", function (event) {
                const [mx] = d3.pointer(event)
                const zx = xScale.invert(mx)
                // Find nearest KDE point
                const closest = xVals.lineData.reduce((a, b) =>
                    Math.abs(a.x - zx) < Math.abs(b.x - zx) ? a : b
                )
                setHoverInfo({
                    type: 'curve',
                    value: closest,
                    x: event.clientX,
                    y: event.clientY,
                })
            })
            .on("mouseleave", () => setHoverInfo(null))


        chartContent.append("path")
            .datum(yVals.lineData)
            .attr("class", "density-curve")
            .attr("fill", "none")
            .attr("stroke", "purple")
            .attr("stroke-width", 2)
            .attr("d", line)
            .on("mousemove", function (event) {
                const [mx] = d3.pointer(event)
                const zx = xScale.invert(mx)
                // Find nearest KDE point
                const closest = yVals.lineData.reduce((a, b) =>
                    Math.abs(a.x - zx) < Math.abs(b.x - zx) ? a : b
                )
                setHoverInfo({
                    type: 'curve',
                    value: closest,
                    x: event.clientX,
                    y: event.clientY,
                })
            })
            .on("mouseleave", () => setHoverInfo(null))


        function drawLine(marker: number, color: string, type: "mean" | "median" | "mode", lineData: { x: number, y: number }[]) {
            chartContent.append("line")
                .datum(marker)
                .attr("x1", xScale(marker))
                .attr("x2", xScale(marker))
                .attr("y1", yScale(getYAtX(lineData, marker)))
                .attr("y2", height)
                .attr("stroke", color)
                .attr("stroke-dasharray", "4 2")
                .on("mousemove", (event) =>
                    setHoverInfo({
                        type,
                        value: marker,
                        x: event.clientX,
                        y: event.clientY,
                    })
                )
                .on("mouseleave", () => setHoverInfo(null));
        }

        drawLine(xVals.mean, "red", "mean", xVals.lineData);
        drawLine(xVals.median, "orange", "median", xVals.lineData);
        drawLine(xVals.mode, "green", "mode", xVals.lineData);

        drawLine(yVals.mean, "red", "mean", yVals.lineData);
        drawLine(yVals.median, "orange", "median", yVals.lineData);
        drawLine(yVals.mode, "green", "mode", yVals.lineData);


        if (binDataPoint1X?.length && binDataPoint1Y && selectedPoint) {
            chartContent.selectAll("hist-selected")
                .data(binDataPoint1X)
                .enter()
                .append("rect")
                .attr("class", "hist")
                .attr("x", d => xScale(d.x0))
                .attr("width", d => xScale(d.x1) - xScale(d.x0))
                .attr("y", d => yScale(d.count))
                .attr("height", d => height - yScale(d.count))
                .attr("fill", "limegreen")
                .attr("opacity", 0.5)
                .on("mousemove", function (event, d) {
                    d3.select(this).attr('style', 'fill: orange;');
                    setHoverInfo({
                        type: 'bar',
                        value: d,
                        x: event.clientX,
                        y: event.clientY,
                    })
                })
                .on("mouseleave", function () {
                    d3.select(this).attr('style', 'fill: limegreen');
                    setHoverInfo(null)
                })

            chartContent.selectAll("hist-selected")
                .data(binDataPoint1Y)
                .enter()
                .append("rect")
                .attr("class", "hist")
                .attr("x", d => xScale(d.x0))
                .attr("width", d => xScale(d.x1) - xScale(d.x0))
                .attr("y", d => yScale(d.count))
                .attr("height", d => height - yScale(d.count))
                .attr("fill", "seagreen")
                .attr("opacity", 0.5)
                .on("mousemove", function (event, d) {
                    d3.select(this).attr('style', 'fill: orange;');
                    setHoverInfo({
                        type: 'bar',
                        value: d,
                        x: event.clientX,
                        y: event.clientY,
                    })
                })
                .on("mouseleave", function () {
                    d3.select(this).attr('style', 'fill: seagreen;');
                    setHoverInfo(null)
                })

            const xVals = generateKDE(
                selectedPoint.counts[0].flatMap((count, i) => Array(count).fill((selectedPoint.bins[0][i] + selectedPoint.bins[0][i + 1]) / 2)),
                domain,
                d3.max(binDataPoint1X, b => b.count) ?? 1
            )

            const yVals = generateKDE(
                selectedPoint.counts[1].flatMap((count, i) => Array(count).fill((selectedPoint.bins[1][i] + selectedPoint.bins[1][i + 1]) / 2)),
                domain,
                d3.max(binDataPoint1Y, b => b.count) ?? 1
            )

            chartContent.append("path")
                .datum(xVals.lineData)
                .attr("class", "density-curve")
                .attr("fill", "none")
                .attr("stroke", "purple")
                .attr("stroke-width", 2)
                .attr("d", line)
                .on("mousemove", function (event) {
                    const [mx] = d3.pointer(event)
                    const zx = xScale.invert(mx)
                    const closest = xVals.lineData.reduce((a, b) =>
                        Math.abs(a.x - zx) < Math.abs(b.x - zx) ? a : b
                    )
                    setHoverInfo({
                        type: 'curve',
                        value: closest,
                        x: event.clientX,
                        y: event.clientY,
                    })
                })
                .on("mouseleave", () => setHoverInfo(null))

            drawLine(xVals.mean, "red", "mean", xVals.lineData);
            drawLine(xVals.median, "orange", "median", xVals.lineData);
            drawLine(xVals.mode, "green", "mode", xVals.lineData);
            drawLine(yVals.mean, "red", "mean", yVals.lineData);
            drawLine(yVals.median, "orange", "median", yVals.lineData);
            drawLine(yVals.mode, "green", "mode", yVals.lineData);

        }

        // Zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 10])
            .translateExtent([[0, 0], [width, height]])
            .extent([[0, 0], [width, height]])
            .on("zoom", (event) => {
                const transform = event.transform
                const zx = transform.rescaleX(xScale)

                xAxis.call(d3.axisBottom(zx))

                chartContent.selectAll("line")
                    .attr("x1", d => zx(d))
                    .attr("x2", d => zx(d))

                chartContent.selectAll<SVGRectElement, d3.Bin<number, number>>("rect.hist")
                    .attr("x", d => zx(d.x0))
                    .attr("width", d => zx(d.x1) - zx(d.x0))

                const newLine = d3.line<{ x: number, y: number }>()
                    .x(d => zx(d.x))
                    .y(d => yScale(d.y))

                chartContent.selectAll<SVGPathElement, { x: number, y: number }[]>("path.density-curve")
                    .attr("d", d => newLine(d))

            })

        svg.call(zoom).call(zoom.transform, d3.zoomIdentity)
    }, [bins, counts, size, selectedPoint])

    return (
        <div className="flex flex-col h-full">
            <div className="flex top-2 w-10 right-0 z-10 bg-white bg-opacity-80 p-2 rounded shadow">
                <input
                    type="number"
                    min={10}
                    max={500}
                    value={numBins}
                    onChange={(e) => onChangeNumBins(+e.target.value)}
                    className="border px-1 text-xs w-10"
                />
            </div>
            <div ref={containerRef} className="relative flex w-full h-full">
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
                        {hoverInfo.type === 'bar' && (
                            <>Bin: [{hoverInfo.value.x0.toFixed(2)}, {hoverInfo.value.x1.toFixed(2)}] <br /> Count: {hoverInfo.value.count}</>
                        )}
                        {hoverInfo.type === 'curve' && (
                            <>x: {hoverInfo.value.x.toFixed(2)} <br /> Density: {hoverInfo.value.y.toFixed(2)}</>
                        )}
                        {['mean', 'median', 'mode'].includes(hoverInfo.type) && (
                            <>{hoverInfo.type.toUpperCase()}: {hoverInfo.value.toFixed(2)}</>
                        )}
                    </div>
                    , document.body)}
            </div>

        </div>

    )
}
