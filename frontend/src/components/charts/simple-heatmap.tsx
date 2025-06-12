"use client"

import { useRef, useEffect, useState } from "react"
import * as d3 from "d3"

interface SimpleHeatmapProps {
  frames: number[][][]
  numRows: number
  numCols: number
  numFrames: number
}

export default function SimpleHeatmap({ frames, numRows, numCols, numFrames }: SimpleHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentFrame, setCurrentFrame] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = 400
    canvas.height = 400

    const frameData = frames[currentFrame]
    if (!frameData) return

    // Calculate cell dimensions
    const cellWidth = canvas.width / numCols
    const cellHeight = canvas.height / numRows

    // Get min/max for normalization
    const flatValues = frameData.flat().flat()
    const minVal = Math.min(...flatValues)
    const maxVal = Math.max(...flatValues)
    const range = maxVal - minVal || 1

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw cells
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const value = frameData[col]?.[row]
        if (value !== undefined) {
          // Normalize value for display
          const normalizedValue = (value - minVal) / range
          ctx.fillStyle = d3.interpolateViridis(normalizedValue)
          ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight)

          // Add border
          ctx.strokeStyle = "#000"
          ctx.lineWidth = 1
          ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight)
        }
      }
    }
  }, [frames, currentFrame, numRows, numCols])

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Simple Heatmap</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Frame: {currentFrame + 1} / {numFrames}
        </label>
        <input
          type="range"
          min={0}
          max={numFrames - 1}
          value={currentFrame}
          onChange={(e) => setCurrentFrame(Number.parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <canvas ref={canvasRef} className="border border-gray-300" style={{ width: "400px", height: "400px" }} />
    </div>
  )
}
