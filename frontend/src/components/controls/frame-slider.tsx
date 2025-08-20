import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

/**
 * Props for FrameSlider component.
 */
interface FrameSliderProps {
  /** Total number of frames available */
  totalFrames: number
  /** Currently selected frame */
  currentFrame: number
  /** Function to update the current frame */
  setCurrentFrame: (frame: number) => void
  /** Whether the animation is currently playing */
  isPlaying: boolean
  /** Function to toggle play/pause state */
  setIsPlaying: (playing: boolean) => void
}

/**
 * Generic icon button used for frame controls
 * @param onClick - Callback when button is clicked
 * @param children - Icon to render inside the button
 */
function IconButton({ onClick, children }: { onClick: () => void, children: React.ReactNode }) {
  return (
    <Button variant="outline" size="icon" onClick={onClick} className="h-8 w-8">
      {children}
    </Button>
  )
}

/**
 * Displays the current frame and allows direct editing via input
 * @param totalFrames - Total number of frames
 * @param currentFrame - Currently selected frame
 * @param onChange - Callback when a new frame is submitted
 */
function FrameDisplay({ totalFrames, currentFrame, onChange }: { totalFrames: number, currentFrame: number, onChange: (frame: number) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState("")

  const handleSubmit = () => {
    console.log("Submitting frame:", inputValue)
    const num = parseInt(inputValue)
    console.log("Parsed frame number:", num)
    if (!isNaN(num)) {
      onChange(num)
      console.log
    }
    setIsEditing(false)
  }

  return (
    <div className="text-xs w-20 text-center">
      {isEditing ? (
        <div className="flex items-center justify-center gap-1">
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="h-8 w-8 text-center border rounded text-sm"
            autoFocus
            min={0}
            max={totalFrames - 1}
          />
          <span>/ {totalFrames - 1}</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="default"
            size="icon"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8 border font-normal"
          >
            {currentFrame}
          </Button>
          <span>/ {totalFrames - 1}</span>
        </div>
      )}
    </div>
  )
}

/**
 * FrameSlider component allows navigation through frames with a slider and control buttons.
 * Supports play/pause, skipping, and direct input.
 */
export default function FrameSlider({ totalFrames, currentFrame, setCurrentFrame, isPlaying = false, setIsPlaying }: FrameSliderProps) {

  return (
    <div className="space-y-3">
      <Slider
        value={[currentFrame]}
        min={0}
        max={totalFrames - 1}
        step={1}
        onValueChange={(v) => setCurrentFrame(v[0])}
        className="mb-2"
      />

      {/* Navigation controls */}
      <div className="flex items-center justify-center gap-2">

        {/* Play/Pause Button */}
        <IconButton onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </IconButton>

        {/* Start / Previous */}
        <IconButton onClick={() => setCurrentFrame(0)}>
          <SkipBack className="h-4 w-4" />
        </IconButton>
        <IconButton onClick={() => setCurrentFrame(currentFrame - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </IconButton>

        <FrameDisplay totalFrames={totalFrames} currentFrame={currentFrame} onChange={setCurrentFrame} />

        {/* Next / End */}
        <IconButton onClick={() => setCurrentFrame(currentFrame + 1)}>
          <ChevronRight className="h-4 w-4" />
        </IconButton>
        <IconButton onClick={() => setCurrentFrame(totalFrames - 1)}>
          <SkipForward className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  )
}
