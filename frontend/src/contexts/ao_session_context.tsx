import { createContext, useContext, useState, type ReactNode } from "react";
import type { MetadataSummary } from "../types/metadata_summary";

interface AoSessionProviderProps {
  children: ReactNode;
}

interface AoSessionContextType {
  fileName: string | null;
  fileSize: number | null;
  metadataSummary: MetadataSummary | null;
  setSession: (fileName: string, fileSize: number, metadata: MetadataSummary) => void;
  clearSession: () => void;
}
const AoSessionContext = createContext<AoSessionContextType | undefined>(undefined);

export const AoSessionProvider = ({ children }: AoSessionProviderProps) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [metadataSummary, setMetadataSummary] = useState<MetadataSummary | null>(null);
  
  const setSession = (fileName: string, fileSize: number, metadata: MetadataSummary) => {
    setFileName(fileName);
    setFileSize(fileSize);
    setMetadataSummary(metadata);
  };

  const clearSession = () => {
    setFileName(null);
    setFileSize(null);
    setMetadataSummary(null);
  };

  return (
    <AoSessionContext.Provider value={{ fileName, fileSize, metadataSummary, setSession, clearSession }}>
      {children}
    </AoSessionContext.Provider>
  );
};

export const useAoSession = () => {
  const ctx = useContext(AoSessionContext);
  if (!ctx) {
    throw new Error("useAoSession must be used inside AoSessionProvider");
  }
  return ctx;
};
