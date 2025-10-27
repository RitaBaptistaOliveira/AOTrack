import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"

interface TimelineHeaderProps {
  showControlBar: boolean
  setShowControlBar: (show: boolean) => void
}

export default function TimelineViewHeader({showControlBar, setShowControlBar }: TimelineHeaderProps) {
  return (
    <div className="flex justify-between items-center flex-shrink-0 pb-1">
      <h2 className="text-lg font-semibold">Timeline View</h2>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => setShowControlBar(!showControlBar)}>
          {showControlBar ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </div>
    </div>
  )
}
