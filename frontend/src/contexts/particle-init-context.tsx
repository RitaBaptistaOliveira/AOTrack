import { createContext, useContext, useEffect, useState, type ReactNode} from "react";
import { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

interface ParticleInitContextType {
  init: boolean;
}

const ParticleInitContext = createContext<ParticleInitContextType | undefined>(undefined);

export const useParticleInit = (): ParticleInitContextType => {
  const context = useContext(ParticleInitContext);
  if (!context) {
    throw new Error("useParticleInit must be used within a ParticleInitProvider");
  }
  return context;
};

interface ParticleInitProviderProps {
  children: ReactNode;
}

export const ParticleInitProvider = ({ children }: ParticleInitProviderProps) => {
  const [init, setInit] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        await initParticlesEngine(async (engine) => {
          await loadSlim(engine);
        });
        setInit(true);
      } catch (err) {
        console.error("Particles failed to load", err);
      }
    }

    if (!init) {
      initialize();
    }
  }, [init]);

  return (
    <ParticleInitContext.Provider value={{ init }}>
      {children}
    </ParticleInitContext.Provider>
  );
};
