import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react"
import { useState, type ReactElement, type ReactNode } from "react"

/**
 * Props for {@link FrameSlider}.
 */
interface FrameSliderProps {
  /** Total number of frames available */
  totalFrames: number
  /** Currently selected frame */
  currentFrame: number
  /** Update the current frame */
  setCurrentFrame: (frame: number) => void
  /** A boolean indicating if the animation is currently playing */
  isPlaying: boolean
  /** Function to toggle play/pause state */
  setIsPlaying: (playing: boolean) => void
}

/**
 * Renders a generic icon button used for frame controls
 * 
 * @param onClick Callback when button is clicked
 * @param children Icon to render inside the button
 * 
 * @category Component
 */
function IconButton({ onClick, children }: { onClick: () => void, children: ReactNode }): ReactElement {
  return (
    <Button variant="outline" size="icon" onClick={onClick} className="h-8 w-8">
      {children}
    </Button>
  )
}

/**
 * Renders the current frame number and allows direct editing via input
 * 
 * @param totalFrames - Total number of frames
 * @param currentFrame - Currently selected frame
 * @param onChange - Callback when a new frame is submitted
 * 
 * @category Component
 */
function FrameDisplay({ totalFrames, currentFrame, onChange }: { totalFrames: number, currentFrame: number, onChange: (frame: number) => void }): ReactElement {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState("")

  /**
   * Handles the submission of a new frame number.
   * Parses the input value and updates the current frame if valid.
   */
  const handleSubmit = () => {
    const num = parseInt(inputValue)
    if (!isNaN(num)) {
      onChange(num)
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
 * Render a controller that allows navigation through frames with a slider and control buttons.
 * Supports play/pause, skipping, and direct input.
 * 
 * @param props The props for configuring the slider defined in {@link FrameSliderProps}.
 * @category Component
 */
export default function FrameSlider({ totalFrames, currentFrame, setCurrentFrame, isPlaying = false, setIsPlaying }: FrameSliderProps): ReactElement {

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
        <IconButton onClick={() => {
          if(currentFrame === totalFrames - 1){
            setCurrentFrame(0)
            setIsPlaying(!isPlaying)
          } else setIsPlaying(!isPlaying)
        }}>
          {currentFrame !== totalFrames - 1 ?
            (isPlaying ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4" /> ) : <RefreshCcw className="h-4 w-4" />}
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
