import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

interface FrameSliderProps {
  totalFrames: number
  currentFrame: number
  setCurrentFrame: (frame: number) => void
  isPlaying?: boolean
  setIsPlaying?: (playing: boolean) => void
}

export default function FrameSlider({totalFrames, currentFrame, setCurrentFrame, isPlaying = false, setIsPlaying,}: FrameSliderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState((currentFrame + 1).toString())

  const goToFrame = useCallback((frame: number) => {
    if (totalFrames <= 0) return;
    const frameNum = Math.max(0, Math.min(frame, totalFrames - 1))
    setCurrentFrame(frameNum)
    setInputValue((frameNum + 1).toString())
  }, [totalFrames, setCurrentFrame])

  const handleInputSubmit = useCallback(() => {
    const num = parseInt(inputValue)
    if (!isNaN(num)) goToFrame(num - 1)
    else setInputValue((currentFrame + 1).toString())
    setIsEditing(false)
  }, [inputValue, currentFrame, goToFrame])

  const togglePlayPause = () => {
    setIsPlaying?.(!isPlaying)
  };

  useEffect(() => {
    if (!isPlaying || !setIsPlaying) return;

    const interval = setInterval(() => {
      const next = currentFrame + 1;
      if (next >= totalFrames) {
        setIsPlaying(false);
      } else setCurrentFrame(next);
    }, 100); // speed (ms)

    return () => clearInterval(interval);
  }, [isPlaying, totalFrames, setCurrentFrame, currentFrame, setIsPlaying]);

  return (
    <div className="space-y-3">
      {/* Frame slider */}
      <div>
        <Slider
          value={[currentFrame]}
          min={0}
          max={totalFrames - 1}
          step={1}
          onValueChange={(value) => goToFrame(value[0])}
          className="mb-2"
        />
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-center gap-2">

        {/* Play/Pause Button */}
        {setIsPlaying && (
        <Button variant="outline" size="icon" onClick={togglePlayPause} className="h-8 w-8 mr-2">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        )}

        {/* Frame Navigation Buttons */}

        { /* Skip to Start and Previous Frame */}
        <Button variant="outline" size="icon" onClick={() => goToFrame(0)} className="h-8 w-8">
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="icon" onClick={() => goToFrame(currentFrame - 1)} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Editable Frame Display */}
        <div className="text-xs w-20 text-center">
          {isEditing ? (
            <div className="w-full flex flex-row items-center justify-center gap-1">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleInputSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInputSubmit()
                }}
                className="h-8 w-8 flex-auto text-center border rounded text-sm"
                autoFocus
                min={1}
                max={totalFrames}
              />
              <div>/ {totalFrames}</div>
            </div>
          ) : (
            <div className="w-full flex flex-row items-center justify-center gap-1">
              <Button variant="default" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8 border font-normal">
                {currentFrame + 1}
              </Button>
              <div>/ {totalFrames}</div>
            </div>
          )}
        </div>

        {/* Next Frame and Skip to End */}
        <Button variant="outline" size="icon" onClick={() => goToFrame(currentFrame + 1)} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="icon" onClick={() => goToFrame(totalFrames - 1)} className="h-8 w-8">
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
