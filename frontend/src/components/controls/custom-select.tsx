import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import Portal from "@/components/ui/portal"
import type { IntervalType } from "@/types/visualization"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

/**
 * Represents the available option types for the CustomSelect component.
 * Similar to the IntervalType, but specifically for the custom select dropdown.
 */
type OptionType = "minmax" | "zscale" | "percentile"

/** Default percentile value used when no value is provided. */
const INITIAL_PERCENTILE = 80

/**
 * Props for the {@link CustomSelect} component.
 */
interface CustomSelectProps {
    /** The currently selected interval value. */
    value: IntervalType
    /**
     * Callback fired when the selected value changes.
     * @param value The new interval value.
     */
    onValueChange: (value: IntervalType) => void
}

/**
 * A custom dropdown select component for choosing the interval type
 * between "MinMax", "Z-Scale", or a numeric "Percentile" option. 
 * 
 * The Percentile option includes an inline editable number input.
 *
 * This component:
 * - Opens a dropdown when clicked.
 * - Mimics the highlights of the selected or hovered options of shadcn.
 * - Allows percentile adjustment with validation.
 *
 */
export default function CustomSelect({ value, onValueChange }: CustomSelectProps) {

    /** Whether the dropdown menu is open. */
    const [isOpen, setIsOpen] = useState(false)
    /** Position for rendering the dropdown portal. */
    const [position, setPosition] = useState({ top: 0, left: 0 })

    /** Tracks which option is currently hovered in the dropdown. */
    const [hoveredOption, setHoveredOption] = useState<OptionType | null>(null)
    /** Whether the dropdown is currently hovered. */
    const [isDropdownHovered, setIsDropdownHovered] = useState(false)
    /** Determines the option type from the current value prop. */
    const currentOption: OptionType = value.startsWith("percentile-")
        ? "percentile"
        : (value as OptionType)

    /** Extracts the initial percentile value from the current value prop. */
    const initialPercentile = useMemo(() => {
        const num = Number.parseInt(value.split("-")[1], 10)
        return isNaN(num) ? INITIAL_PERCENTILE : Math.max(1, Math.min(100, num))
    }, [value])

    /** Input field string value for percentile editing. */
    const [inputValue, setInputValue] = useState(String(initialPercentile))
    /** Numeric percentile value. */
    const [percentile, setPercentile] = useState(initialPercentile)

    /** Ref to the button that triggers the dropdown. */
    const triggerRef = useRef<HTMLDivElement>(null)
    /** Ref to the dropdown portal content. */
    const portalContentRef = useRef<HTMLDivElement>(null)
    /** Tracks if Enter was pressed to avoid duplicate commit. */
    const enterPressedRef = useRef(false)

    /**
     * Handles selecting an option from the dropdown.
     * @param option The selected option type.
     */
    const handleOptionSelect = (option: OptionType) => {
        if (option === "percentile") {
            onValueChange(`percentile-${percentile}`)
        } else if (currentOption !== option) {
            onValueChange(option)
        }
        setIsOpen(false)
        setIsDropdownHovered(false)
    }

    /**
     * Handles focus event on percentile input.
     * Switches selection to percentile mode if not already selected.
     */
    const handlePercentileInputFocus = () => {
        if (currentOption !== "percentile") {
            onValueChange(`percentile-${percentile}`)
        }
        setIsOpen(true)
        setIsDropdownHovered(true)
    }

    /**
     * Handles change in percentile input field.
     * Only numeric values are allowed.
     */
    const handlePercentileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value.replace(/[^0-9]/g, ""))
    }

    /**
     * Handles Enter key in percentile input to commit value and close dropdown.
     */
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            enterPressedRef.current = true
            validateAndCommitPercentile()
            e.currentTarget.blur()
            setIsOpen(false)
            setIsDropdownHovered(false)
        }
    }

    /**
     * Handles clicking outside og the dropdown. If percentile is selected, then check input to commit value and close dropdown.
     */
    const handleClickOutside = (e: MouseEvent) => {
        if (!triggerRef.current?.contains(e.target as Node) && !portalContentRef.current?.contains(e.target as Node)) {
            setIsOpen(false)
            setIsDropdownHovered(false)
            if (currentOption === "percentile") { validateAndCommitPercentile() }
        }
    }

    /**
     * Validates and commits the current percentile input value.
     * Clamps between 1 and 100, updates state and triggers value change.
     */
    const validateAndCommitPercentile = () => {
        if (enterPressedRef.current) {
            enterPressedRef.current = false
            return
        }

        let num = Number.parseInt(inputValue)

        if (isNaN(num)) {
            setInputValue(String(percentile))
            return
        }

        num = Math.min(100, Math.max(1, num))
        setInputValue(String(num))

        if (num !== percentile) {
            setPercentile(num)
            onValueChange(`percentile-${num}`)
        }
    }

    /**
     * Renders a dropdown option row.
     *
     * @param label Display label for the option.
     * @param option Option type.
     * @param extra Optional extra content (e.g. input field for percentile).
     */
    const renderOption = (label: string, option: OptionType, extra?: React.ReactNode) => {
        const isSelected = currentOption === option
        const isHovered = hoveredOption === option
        const isHighlighted =
            isDropdownHovered &&
            (isHovered || (isSelected && hoveredOption === null))
        return (
            <div
                className={cn(
                    "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none",
                    isHighlighted && "bg-accent",
                    "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => handleOptionSelect(option)}
                onMouseEnter={() => setHoveredOption(option)}
                onMouseLeave={() => setHoveredOption(null)}
            >
                <span>{label}</span>
                {extra}
                {currentOption === option && (
                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4" />
                    </span>
                )}
            </div>)
    }


    // Position dropdown on open
    useLayoutEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            setPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX
            })
        }
    }, [isOpen])

    // Handles closing the dropdown when clicking outside
    useEffect(() => {
        if (isOpen) {
            document.addEventListener("click", handleClickOutside, true)
        }

        return () => document.removeEventListener("click", handleClickOutside, true)

    }, [isOpen, currentOption, inputValue, percentile])

    return (
        <div ref={triggerRef}>
            <button
                className="h-9 text-xs w-29 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent p-2 whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                onClick={() => {
                    setIsOpen(!isOpen)
                    setIsDropdownHovered(!isDropdownHovered)
                    setHoveredOption(currentOption)
                }}
            >
                {currentOption === "percentile"
                    ? `Percentile: ${percentile}`
                    : currentOption.charAt(0).toUpperCase() + currentOption.slice(1)}
                <ChevronDown className={cn("size-4 opacity-50")} />
            </button>

            {isOpen && (
                <Portal>
                    <div
                        ref={portalContentRef}
                        onMouseLeave={() => {
                            setIsDropdownHovered(false)
                            setHoveredOption(null)
                        }}
                        className="absolute z-50 mt-1 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                        style={{ top: position.top, left: position.left }}
                    >
                        {renderOption("MinMax", "minmax")}
                        {renderOption("Z-Scale", "zscale")}
                        {renderOption("Percentile", "percentile",
                            <div className="flex items-center ml-auto" onClick={(e) => e.stopPropagation()}>
                                <Input
                                    type="text"
                                    value={inputValue}
                                    onChange={handlePercentileInputChange}
                                    onBlur={validateAndCommitPercentile}
                                    onKeyDown={handleInputKeyDown}
                                    onFocus={handlePercentileInputFocus}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-10 h-5 text-center text-xs p-1 "
                                />
                            </div>
                        )}
                    </div>
                </Portal>
            )}
        </div>
    )
}
