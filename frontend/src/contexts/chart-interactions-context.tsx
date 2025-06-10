import type { ColorMap, IntervalType, ScaleType } from "@/types/visualization";
import React, { createContext, useContext, useState } from "react";

type Point = { row: number; col: number };

interface ChartInteractionContextType {
    currentFrame: number;
    setCurrentFrame: (frame: number) => void;

    selectedPoint: Point | null;
    setSelectedPoint: (point: Point | null) => void;

    hoveredPoint: Point | null;
    setHoveredPoint: (point: Point | null) => void;

    colorMap: ColorMap;
    setColorMap: (cm: ColorMap) => void;

    scaleType: ScaleType;
    setScaleType: (st: ScaleType) => void;

    intervalType: IntervalType;
    setIntervalType: (it: IntervalType) => void;
}

const ChartInteractionContext = createContext<ChartInteractionContextType | undefined>(undefined);

export const ChartInteractionProvider = ({ children }: { children: React.ReactNode }) => {
    const [currentFrame, setCurrentFrame] = useState(0);
    const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
    const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);

    const [colorMap, setColorMap] = useState<ColorMap>("viridis");
    const [scaleType, setScaleType] = useState<ScaleType>("linear");
    const [intervalType, setIntervalType] = useState<IntervalType>("minmax");

    return (
        <ChartInteractionContext.Provider
            value={{
                currentFrame,
                setCurrentFrame,
                selectedPoint,
                setSelectedPoint,
                hoveredPoint,
                setHoveredPoint,
                colorMap,
                setColorMap,
                scaleType,
                setScaleType,
                intervalType,
                setIntervalType,
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