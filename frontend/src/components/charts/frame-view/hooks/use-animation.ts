import { useEffect, useRef } from "react"

const INTERVAL = 1000 / 3 // 3 FPS

export function useAnimation(
  isPlaying: boolean,
  numFrames: number,
  onFrameChange: (frame: number) => void,
  setIsPlaying: (playing: boolean) => void,
  scheduleDraw: () => void,
  selectedCell?: { frame: number, col: number, row: number } | null
) {
  const prevFrameRef = useRef<number>(0)

  const handleFrameChange = (frame: number) => {
    if (frame < 0 || frame >= numFrames) {
      frame = Math.max(0, Math.min(frame, numFrames - 1))
    }
    if (frame === prevFrameRef.current) return
    prevFrameRef.current = frame
    if (selectedCell?.frame !== frame) {
      onFrameChange(frame)
    }
    scheduleDraw()
  }

  useEffect(() => {
    console.log("Triggered: ", isPlaying)
    if (!isPlaying) return

    let animationFrameId: number
    let lastTime = performance.now()

    const animate = () => {
      const now = performance.now()
      if (now - lastTime >= INTERVAL) {
        if (prevFrameRef.current < numFrames - 1) handleFrameChange(prevFrameRef.current + 1)
        else setIsPlaying(false)
        lastTime += INTERVAL
      }
      animationFrameId = requestAnimationFrame(animate)
    }
    animationFrameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrameId)
  }, [isPlaying, numFrames])

  return { prevFrameRef, handleFrameChange}
}
