import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { MetadataSummary } from "../types/metadata_summary"
import { parseMetadata } from "@/utils"

interface AoSessionProviderProps {
  children: ReactNode
}

interface AoSessionContextType {
  fileName: string | null
  fileSize: number | null
  metadataSummary: MetadataSummary | null
  setSession: (fileName: string, fileSize: number, metadata: MetadataSummary) => void
  clearSession: () => void
  wfs: number
  setWfs: (value: number) => void
  wfc: number
  setWfc: (value: number) => void
}
const AoSessionContext = createContext<AoSessionContextType | undefined>(undefined)

export const AoSessionProvider = ({ children }: AoSessionProviderProps) => {
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [metadataSummary, setMetadataSummary] = useState<MetadataSummary | null>(null)
  const [wfs, setWfs] = useState<number>(0)
  const [wfc, setWfc] = useState<number>(0)


  const setSession = (fileName: string, fileSize: number, metadata: MetadataSummary) => {
    setFileName(fileName)
    setFileSize(fileSize)
    setMetadataSummary(metadata)
  }

  const clearSession = () => {
    setFileName(null)
    setFileSize(null)
    setMetadataSummary(null)
  }


  const fetchSession = async () => {
    try {
      const response = await fetch("http://localhost:8000/session", {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) throw new Error("Session fetch failed")

      const data = await response.json()
      setSession("", 0, parseMetadata(data.metadata))

    } catch (err) {
      console.error("Fetch session error:", err)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [])

  return (
    <AoSessionContext.Provider value={{ fileName, fileSize, metadataSummary, setSession, clearSession, wfs, setWfs, wfc, setWfc }}>
      {children}
    </AoSessionContext.Provider>
  )
}

export const useAoSession = () => {
  const ctx = useContext(AoSessionContext)
  if (!ctx) {
    throw new Error("useAoSession must be used inside AoSessionProvider")
  }
  return ctx
}
