import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { createPortal } from "react-dom"

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
    const [hoverInfo, setHoverInfo] = useState<null | {
        type: 'bar' | 'curve' | 'mean' | 'median' | 'mode'
        value: any
        x: number
        y: number
    }>(null)

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


    function genKDE(data: number[], bins: d3.Bin<number, number>[], domain: [number, number]) {
        const [xStart, xEnd] = domain;
        const xValues = d3.range(xStart, xEnd, (xEnd - xStart) / 100);
        const range = xEnd - xStart;
        const bandwidth = range * 0.1; // 10% of data range
        const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), xValues);
        const rawKDE = kde(data);
        const scaleFactor = d3.max(bins, b => b.length)! / d3.max(rawKDE, d => d.y || 1)!;
        const scaledKDE = rawKDE.map(d => ({
            x: d.x,
            y: Math.max(0, d.y * scaleFactor || 0),
        }));

        const threshold = 0.1;

        // Find start and end of significant density
        const first = scaledKDE.findIndex(d => d.y > threshold);
        const last = scaledKDE.length - 1 - [...scaledKDE].reverse().findIndex(d => d.y > threshold);

        const lineData = [];

        if (first > 0) {
            // Add leading zero point
            lineData.push({ x: scaledKDE[first - 1].x, y: 0 });
        }

        lineData.push(...scaledKDE.slice(first, last + 1));

        if (last < scaledKDE.length - 1) {
            // Add trailing zero point
            lineData.push({ x: scaledKDE[last + 1].x, y: 0 });
        }

        const mean = d3.mean(data)!;
        const median = d3.median(data)!;
        const mode = scaledKDE.reduce((a, b) => (a.y > b.y ? a : b)).x;

        return { mean, median, mode, lineData };
    }

    function getYAtX(lineData: { x: number; y: number }[], targetX: number): number {
        for (let i = 1; i < lineData.length; i++) {
            const prev = lineData[i - 1];
            const curr = lineData[i];

            if (curr.x >= targetX) {
                const t = (targetX - prev.x) / (curr.x - prev.x);
                return prev.y + t * (curr.y - prev.y); // linear interpolation
            }
        }

        // If targetX is outside the lineData range
        return lineData[lineData.length - 1].y;
    }


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

        const margin = { top: 20, right: 30, bottom: 20, left: 20 }
        const width = size.width - margin.left - margin.right
        const height = size.height - margin.top - margin.bottom

        const svg = d3.select(svgRef.current)
        svg.selectAll("*").remove()

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)
        const chartContent = g.append("g")

        // Intensities
        const intensitiesDefault = data.map((d) => d.y);
        const intensitiesPoint = selectedPoint?.map((d) => d.y);

        // const selectedY = selectedPoint?.map((d) => d.y) ?? [];
        // const allY = [...dataY, ...selectedY];
        const allY = [...intensitiesDefault, ...(intensitiesPoint ?? [])];

        // X and Y Axis
        const [minX, maxX] = d3.extent(allY) as [number, number]
        const padding = (maxX - minX) * 0.05 // 5% padding on each side
        const paddedDomain: [number, number] = [d3.max([0, minX - padding]) ?? 0, maxX + padding]

        //Bins
        const binGenerator = d3.bin().domain(paddedDomain).thresholds(numBins)

        const binDefault = binGenerator(intensitiesDefault)
        const binPoint = binGenerator(intensitiesPoint ?? [])
        const allBins = [...binDefault, ...binPoint]
        const maxBinHeight = d3.max(allBins, b => b.length) ?? 0

        const xScale = d3.scaleLinear().domain(paddedDomain).range([0, width])
        const yScale = d3.scaleLinear().domain([0, maxBinHeight]).range([height, 0])

        const xAxis = svg.append("g").attr("transform", `translate(${margin.left},${height + margin.top})`).attr("class", "x-axis").call(d3.axisBottom(xScale));
        const yAxis = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`).attr("class", "y-axis").call(d3.axisLeft(yScale));

        // const genPDF = (data: number[], bins: d3.Bin<number, number>[]): { mean: number; lineData: { x: number; y: number }[] } => {
        //     const std = d3.deviation(data)!
        //     const mean = d3.mean(data)!
        //     const [min, max] = d3.extent(data) as [number, number]
        //     const pad = (max - min) * 0.05 // 5% padding on each side
        //     const padDomain: [number, number] = [min - pad, max + pad]
        //     const normalPDF = (x: number) =>
        //         (1 / (std * Math.sqrt(2 * Math.PI))) *
        //         Math.exp(-((x - mean) ** 2) / (2 * std ** 2))

        //     const xValues = d3.range(padDomain[0], padDomain[1], (padDomain[1] - padDomain[0]) / 100)
        //     const scaleFactor = d3.max(bins, (d) => d.length)! / normalPDF(mean)
        //     const lineData = xValues.map(x => ({
        //         x,
        //         y: normalPDF(x) * scaleFactor,
        //     }))
        //     return {
        //         mean,
        //         lineData,
        //     }
        // }

        const line = d3.line<{ x: number, y: number }>()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))

        const { mean, median, mode, lineData } = genKDE(intensitiesDefault, binDefault, paddedDomain)

        chartContent.selectAll("hist")
            .data(binDefault)
            .enter()
            .append("rect")
            .attr("class", "hist")
            .attr("x", d => xScale(d.x0!))
            .attr("width", d => xScale(d.x1!) - xScale(d.x0!))
            .attr("y", d => yScale(d.length))
            .attr("height", d => height - yScale(d.length))
            .attr("fill", "steelblue")
            .attr("opacity", 0.6);


        chartContent.append("path")
            .datum(lineData)
            .attr("class", "density-curve")
            .attr("fill", "none")
            .attr("stroke", "purple")
            .attr("stroke-width", 2)
            .attr("d", line)
            .on("mousemove", function (event) {
                // Find nearest x to mouse
                const [mx] = d3.pointer(event)
                const zx = xScale.invert(mx)
                // Find nearest KDE point
                const closest = lineData.reduce((a, b) =>
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

        chartContent.append("line")
            .datum(mean)
            .attr("x1", xScale(mean))
            .attr("x2", xScale(mean))
            .attr("y1", yScale(getYAtX(lineData, mean)))
            .attr("y2", height)
            .attr("stroke", "red")
            .attr("stroke-dasharray", "4 2")
            .on("mousemove", (event) => setHoverInfo({
                type: 'mean', // or 'median'/'mode'
                value: mean,
                x: event.clientX,
                y: event.clientY,
            }))
            .on("mouseleave", () => setHoverInfo(null))

        // Median line
        chartContent.append("line")
            .datum(median)
            .attr("x1", xScale(median))
            .attr("x2", xScale(median))
            .attr("y1", yScale(getYAtX(lineData, median)))
            .attr("y2", height)
            .attr("stroke", "orange")
            .attr("stroke-dasharray", "4 2")
            .on("mousemove", (event) => setHoverInfo({
                type: 'mean', // or 'median'/'mode'
                value: mean,
                x: event.clientX,
                y: event.clientY,
            }))
            .on("mouseleave", () => setHoverInfo(null))

        // Mode line
        chartContent.append("line")
            .datum(mode)
            .attr("x1", xScale(mode))
            .attr("x2", xScale(mode))
            .attr("y1", yScale(getYAtX(lineData, mode)))
            .attr("y2", height)
            .attr("stroke", "green")
            .attr("stroke-dasharray", "2 2")
            .on("mousemove", (event) => setHoverInfo({
                type: 'mean', // or 'median'/'mode'
                value: mean,
                x: event.clientX,
                y: event.clientY,
            }))
            .on("mouseleave", () => setHoverInfo(null))

        if (selectedPoint?.length) {
            const binPoint = binGenerator(intensitiesPoint ?? [])

            const resultPoint = genKDE(intensitiesPoint ?? [], binPoint, paddedDomain)

            chartContent.selectAll("hist")
                .data(binPoint)
                .enter()
                .append("rect")
                .attr("class", "hist")
                .attr("x", d => xScale(d.x0!))
                .attr("width", d => xScale(d.x1!) - xScale(d.x0!))
                .attr("y", d => yScale(d.length))
                .attr("height", d => height - yScale(d.length))
                .attr("fill", "green")
                .attr("opacity", 0.6);

            chartContent.append("path")
                .datum(resultPoint.lineData)
                .attr("class", "density-curve")
                .attr("fill", "none")
                .attr("stroke", "purple")
                .attr("stroke-width", 2)
                .attr("d", line)
                .on("mousemove", function (event) {
                    // Find nearest x to mouse
                    const [mx] = d3.pointer(event)
                    const zx = xScale.invert(mx)
                    // Find nearest KDE point
                    const closest = lineData.reduce((a, b) =>
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

            chartContent.append("line")
                .datum(resultPoint.mean)
                .attr("x1", xScale(resultPoint.mean))
                .attr("x2", xScale(resultPoint.mean))
                .attr("y1", yScale(getYAtX(resultPoint.lineData, resultPoint.mean)))
                .attr("y2", height)
                .attr("stroke", "red")
                .attr("stroke-dasharray", "4 2")
                .on("mousemove", (event) => setHoverInfo({
                    type: 'mean', // or 'median'/'mode'
                    value: mean,
                    x: event.clientX,
                    y: event.clientY,
                }))
                .on("mouseleave", () => setHoverInfo(null))

            chartContent.append("line")
                .datum(resultPoint.median)
                .attr("x1", xScale(resultPoint.median))
                .attr("x2", xScale(resultPoint.median))
                .attr("y1", yScale(getYAtX(resultPoint.lineData, resultPoint.median)))
                .attr("y2", height)
                .attr("stroke", "orange")
                .attr("stroke-dasharray", "4 2")
                .on("mousemove", (event) => setHoverInfo({
                    type: 'mean', // or 'median'/'mode'
                    value: mean,
                    x: event.clientX,
                    y: event.clientY,
                }))
                .on("mouseleave", () => setHoverInfo(null))

            chartContent.append("line")
                .datum(resultPoint.mode)
                .attr("x1", xScale(resultPoint.mode))
                .attr("x2", xScale(resultPoint.mode))
                .attr("y1", yScale(getYAtX(resultPoint.lineData, resultPoint.mode)))
                .attr("y2", height)
                .attr("stroke", "green")
                .attr("stroke-dasharray", "2 2")
                .on("mousemove", (event) => setHoverInfo({
                    type: 'mean', // or 'median'/'mode'
                    value: mean,
                    x: event.clientX,
                    y: event.clientY,
                }))
                .on("mouseleave", () => setHoverInfo(null))
        }

        //Hover
        chartContent.selectAll("rect.hist")
            .on("mousemove", function (event, d) {
                setHoverInfo({
                    type: 'bar',
                    value: d,
                    x: event.clientX,
                    y: event.clientY,
                })
            })
            .on("mouseleave", function () {
                setHoverInfo(null)
            })




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
                    .attr("x2", d => zx(d));

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
                            <>Bin: [{hoverInfo.value.x0.toFixed(2)}, {hoverInfo.value.x1.toFixed(2)}] <br /> Count: {hoverInfo.value.length}</>
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
