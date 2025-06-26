import type { ColorMap, IntervalType, ScaleType } from "@/types/visualization";
import React, { createContext, useContext, useState } from "react";
import * as d3 from "d3"

type Point = { x: number; y: number };

interface ChartInteractionContextType {
    currentFrame: number;
    setCurrentFrame: (frame: number) => void;

    selectedPoint: Point | null;
    setSelectedPoint: (point: Point | null) => void;

    colorMap: ColorMap;
    setColorMap: (cm: ColorMap) => void;

    scaleType: ScaleType;
    setScaleType: (st: ScaleType) => void;

    intervalType: IntervalType;
    setIntervalType: (it: IntervalType) => void;

    interpolator: (t: number) => string;
}

const ChartInteractionContext = createContext<ChartInteractionContextType | undefined>(undefined);

const getInterpolator = (colorMap: ColorMap) => {
    switch (colorMap) {
        case "inferno": return d3.interpolateInferno;
        case "greys": return d3.interpolateGreys;
        case "blues": return d3.interpolateBlues;
        case "reds": return d3.interpolateReds;
        case "greens": return d3.interpolateGreens;
        case "rainbow": return d3.interpolateRainbow;
        case "viridis":
        default: return d3.interpolateViridis;
    }
};

export const ChartInteractionProvider = ({ children }: { children: React.ReactNode }) => {
    const [currentFrame, setCurrentFrame] = useState(0);
    const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

    const [colorMap, setColorMap] = useState<ColorMap>("viridis");
    const [scaleType, setScaleType] = useState<ScaleType>("linear");
    const [intervalType, setIntervalType] = useState<IntervalType>("minmax");

    const interpolator = getInterpolator(colorMap);

    return (
        <ChartInteractionContext.Provider
            value={{
                currentFrame,
                setCurrentFrame,
                selectedPoint,
                setSelectedPoint,
                colorMap,
                setColorMap,
                scaleType,
                setScaleType,
                intervalType,
                setIntervalType,
                interpolator
            }}>
            {children}
        </ChartInteractionContext.Provider>
    );
};

export const useChartInteraction = (): ChartInteractionContextType => {
    const ctx = useContext(ChartInteractionContext);
    if (!ctx) throw new Error("useChartInteraction must be used within ChartInteractionProvider");
    return ctx;
};