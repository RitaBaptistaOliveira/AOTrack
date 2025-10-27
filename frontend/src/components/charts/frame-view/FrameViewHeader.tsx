import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import DropdownGroup from "../../controls/dropdown-group"

interface FrameViewHeaderProps {
  currentFrame: number
  showControlBar: boolean
  setShowControlBar: (show: boolean) => void
}

export default function FrameViewHeader({ currentFrame, showControlBar, setShowControlBar }: FrameViewHeaderProps) {
  return (
    <div className="flex justify-between items-center flex-shrink-0 pb-1">
      <h2 className="text-lg font-semibold">Frame View (Frame {currentFrame})</h2>
      <div className="flex gap-1">
        <DropdownGroup />
        <Button variant="ghost" size="icon" onClick={() => setShowControlBar(!showControlBar)}>
          {showControlBar ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </div>
    </div>
  )
}
