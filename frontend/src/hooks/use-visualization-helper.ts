import type { ColorMap, IntervalType, ScaleType } from "@/types/visualization";
import * as d3 from "d3"
import React from "react";


export function useVisualizationHelper() {

    const [interval, setInterval] = React.useState<IntervalType>("minmax")
    const [scaleType, setScaleType] = React.useState<ScaleType>("linear")
    const [colorMap, setColorMap] = React.useState<ColorMap>("viridis")
    const [currentInterpolator, setCurrentInterpolator] = React.useState(() => d3.interpolateViridis);
    const [currentFrame, setCurrentFrame] = React.useState<number[][]>([]);
    const [modFrame, setModFrame] = React.useState<number[][]>([]);

    const applyChanges = async (frame: number[][], newInterval: IntervalType, newScale: ScaleType) => {
        if (frame.length === 0 || frame[0].length === 0) {
            throw new Error("Data is empty or not properly formatted");
        }
        setCurrentFrame(frame);
        if (JSON.stringify(frame) === JSON.stringify(currentFrame) && newInterval === interval && newScale === scaleType) {
            // No changes to apply
            return modFrame;
        }

        const formData = new FormData();
        formData.append("data", JSON.stringify(frame));
        formData.append("interval_type", newInterval);
        formData.append("scale_type", newScale);


        try {
            const response = await fetch("http://localhost:8000/pixel/apply-changes", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (!response.ok) throw new Error("Invalid response from server");

            const data = await response.json();
            const modifiedData = data.data;

            if (!Array.isArray(modifiedData)) {
                throw new Error("Invalid data format returned from server");
            }
            setInterval(newInterval);
            setScaleType(newScale);
            setModFrame(modifiedData);
            return modifiedData;
        } catch (err) {
            console.error("Upload error:", err);
        }
        return frame; // Return original frame if error occurs
    };


    const getInterpolator = (map: ColorMap) => {
        switch (map) {
            case "inferno":
                return d3.interpolateInferno;
            case "greys":
                return d3.interpolateGreys;
            case "blues":
                return d3.interpolateBlues;
            case "reds":
                return d3.interpolateReds;
            case "greens":
                return d3.interpolateGreens;
            case "rainbow":
                return d3.interpolateRainbow;
            case "viridis":
            default:
                return d3.interpolateViridis;
        }
    };

    const getScaleType = () => {
        return scaleType;
    }
    const getIntervalType = () => {
        return interval;
    };

    const applyColormap = async (newColorMap: ColorMap) => {
        if (newColorMap !== colorMap) {
            setColorMap(newColorMap);
            const interpolator = getInterpolator(newColorMap);
            setCurrentInterpolator(() => interpolator);
            return interpolator;
        }
        return currentInterpolator;
    };

    const getColormap = () => currentInterpolator;

    return {
        applyChanges,
        applyColormap,
        getColormap,
        getScaleType,
        getIntervalType
    };
}