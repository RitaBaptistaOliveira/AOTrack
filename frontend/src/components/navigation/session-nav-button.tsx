import { Button } from "@/components/ui/button"
import { type LucideIcon } from "lucide-react"
import { NavLink } from "react-router"

interface SessionNavButtonProps {
    icon: LucideIcon
    title: string
    text: string
    route: string
}

export default function SessionNavButton({ icon: Icon, title, text, route }: SessionNavButtonProps) {
    return (
        <NavLink to={route} end className="flex flex-1 h-full">
            <Button className="w-full h-full flex flex-col items-center justify-center gap-4 rounded-lg text-left p-8" variant="outline">
                <Icon className="w-12 h-12 text-primary shrink-0 !w-12 !h-12" />
                <div className="flex flex-col gap-2 items-center text-center">
                    <h2 className="text-3xl font-bold text-foreground">{title}</h2>
                    <p className="text-muted-foreground text-base leading-relaxed text-center break-words whitespace-normal max-w-sm">
                        {text}
                    </p>
                </div>
            </Button>
        </NavLink>
    )
}
