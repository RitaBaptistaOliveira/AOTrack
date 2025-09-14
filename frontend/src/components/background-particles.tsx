import { useEffect, useMemo, useState, type ReactElement } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import {type ISourceOptions } from "@tsparticles/engine";

/**
 * Renders a particle background to simulate stars.
 *
 * ```tsx
 * <BackgroundParticles />
 * ```
 * 
 * This component initializes the particle engine and renders particles with randomized size and opacity.
 *
 * @category Component
 */
export function BackgroundParticles(): ReactElement | null {
    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);

        }).catch((err) => {
            console.error("Particles failed to load", err);
        });
    }, []);

    const particlesLoaded = async (): Promise<void> => { }

    const options: ISourceOptions = useMemo(() => ({
        background: {
            color: { value: "transparent" },
        },
        fpsLimit: 120,
        particles: {
            color: { value: "#ffffff" },
            number: {
                density: { enable: true, value_area: 1080 },
                value: 400,
            },
            opacity: {
                value: { min: 0.05, max: 1 },
                animation: {
                    enable: true,
                    speed: 0.5,
                    minimumValue: 0.05,
                    sync: false,
                }
            },
            shape: { type: "circle" },
            size: {
                random: { enable: true, minimumValue: 0.5 },
                value: { min: 0.5, max: 1.5 }
            },
        },
        detectRetina: true,
    }), []);

    if (!init) return null;

    return (
        <div className="absolute inset-0 z-0">
            <Particles
                id="tsparticles"
                particlesLoaded={particlesLoaded}
                options={options}
            />
        </div>
    );
}
