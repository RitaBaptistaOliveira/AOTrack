"use client"

import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { IntervalType } from "@/types/visualization"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Portal from "../ui/portal"

interface CustomSelectWithInputProps {
    value: IntervalType
    onValueChange: (value: IntervalType) => void
}

export default function CustomSelectWithInput({ value, onValueChange }: CustomSelectWithInputProps) {

    const currentSelectedOption: "minmax" | "zscale" | "percentile" = value.startsWith("percentile-")
        ? "percentile"
        : (value as "minmax" | "zscale")


    const initialPercentile = useMemo(() => {
        if (value.startsWith("percentile-")) {
            const num = Number.parseInt(value.split("-")[1], 10)
            return isNaN(num) ? 30 : Math.max(1, Math.min(100, num))
        }
        return 30
    }, [value])

    const [percentileInput, setPercentileInput] = useState<string>(String(initialPercentile))
    const [lastCommittedPercentile, setLastCommittedPercentile] = useState<number>(initialPercentile)
    const [isOpen, setIsOpen] = useState(false)
    const [position, setPosition] = useState({ top: 0, left: 0 })

    const triggerRef = useRef<HTMLDivElement>(null)
    const portalContentRef = useRef<HTMLDivElement>(null)
    const isEnterPressedRef = useRef(false)

    useEffect(() => {
        setPercentileInput(String(initialPercentile))
        setLastCommittedPercentile(initialPercentile)
    }, [initialPercentile])

    useLayoutEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            setPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX
            })
        }
    }, [isOpen])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node) &&
                portalContentRef.current &&
                !portalContentRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
                if (currentSelectedOption === "percentile") {
                    validateAndCommitPercentile()
                }
            }

            event.stopPropagation()
        }

        if (isOpen) {
            document.addEventListener("click", handleClickOutside, true)
        } else {
            document.removeEventListener("click", handleClickOutside, true)
        }

        return () => {
            document.removeEventListener("click", handleClickOutside, true)
        }
    }, [isOpen, currentSelectedOption, percentileInput, lastCommittedPercentile, onValueChange])

    const handleOptionClick = (option: "minmax" | "zscale" | "percentile") => {
        if (option === "percentile") {
            if (currentSelectedOption !== "percentile" || value !== `percentile-${lastCommittedPercentile}`) {
                onValueChange(`percentile-${lastCommittedPercentile}`)
            }
        } else {
            if (currentSelectedOption !== option) {
                onValueChange(option)
            }
        }
        setIsOpen(false)
    }

    const handlePercentileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, "")
        setPercentileInput(val)
    }

    const validateAndCommitPercentile = () => {
        if (isEnterPressedRef.current) {
            isEnterPressedRef.current = false
            return
        }

        let numValue = Number.parseInt(percentileInput, 10)

        if (isNaN(numValue) || percentileInput === "") {
            setPercentileInput(String(lastCommittedPercentile))
        } else {
            if (numValue < 1) {
                numValue = 1
            } else if (numValue > 100) {
                numValue = 100
            }
            if (numValue !== lastCommittedPercentile) {
                setPercentileInput(String(numValue))
                setLastCommittedPercentile(numValue)
                onValueChange(`percentile-${numValue}`)
            } else {
                setPercentileInput(String(numValue))
            }
        }
    }

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            isEnterPressedRef.current = true
            validateAndCommitPercentile()
            e.currentTarget.blur()
            setIsOpen(false)
        }
    }

    const handlePercentileInputFocus = () => {
        if (currentSelectedOption !== "percentile") {
            onValueChange(`percentile-${lastCommittedPercentile}`)
        }
        if (!isOpen) setIsOpen(true)
    }

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

    return (
        <div ref={triggerRef}>
            <button
                className="h-9 text-xs w-29 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent p-2 whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                onClick={() => setIsOpen(!isOpen)}
            >
                {currentSelectedOption === "percentile"
                    ? `Percentile: ${lastCommittedPercentile}`
                    : capitalize(currentSelectedOption)}
                <ChevronDown className={cn("size-4 opacity-50")} />
            </button>

            {isOpen && (
                <Portal>
                    <div
                        ref={portalContentRef} // Attach portalContentRef here
                        className="mt-1 absolute z-50 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                        style={{ top: position.top, left: position.left}}
                    >
                        <div
                            className={cn(
                                "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
                                "hover:bg-accent hover:text-accent-foreground",
                                currentSelectedOption === "minmax" && "bg-accent text-accent-foreground",
                            )}
                            onClick={() => handleOptionClick("minmax")}
                        >
                            <span>MinMax</span>
                            {currentSelectedOption === "minmax" && (
                                <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                                    <Check className="h-4 w-4" />
                                </span>
                            )}
                        </div>

                        <div
                            className={cn(
                                "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
                                "hover:bg-accent hover:text-accent-foreground",
                                currentSelectedOption === "zscale" && "bg-accent text-accent-foreground"
                            )}
                            onClick={() => handleOptionClick("zscale")}
                        >
                            <span>Z-Scale</span>
                            {currentSelectedOption === "zscale" && (
                                <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                                    <Check className="h-4 w-4" />
                                </span>
                            )}
                        </div>

                        <div
                            className={cn(
                                "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
                                "hover:bg-accent hover:text-accent-foreground",
                                currentSelectedOption === "percentile" && "bg-accent text-accent-foreground"
                            )}
                            onClick={() => handleOptionClick("percentile")}
                        >
                            <span>Percentile</span>
                            <div className="flex items-center ml-auto">
                                <Input
                                    type="text"
                                    value={percentileInput}
                                    onChange={handlePercentileInputChange}
                                    onBlur={validateAndCommitPercentile}
                                    onKeyDown={handleInputKeyDown}
                                    onFocus={handlePercentileInputFocus}
                                    onClick={(e: { stopPropagation: () => any }) => e.stopPropagation()}
                                    className="w-10 h-5 text-center text-xs p-1 "
                                />
                                {currentSelectedOption === "percentile" && (
                                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                                        <Check className="h-4 w-4" />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    )
}
