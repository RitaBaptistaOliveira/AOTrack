import { useAoSession } from "../contexts/ao-session-context"
import { parseMetadata } from "@/utils"
export function useAoHelper() {

  const { setSession } = useAoSession()

  const uploadFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".fits")) {
      throw new Error("Only .fits files are allowed")
    }
    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (!response.ok) throw new Error("Upload failed")

      const data = await response.json()
      if (!data.metadata) {
        throw new Error("No metadata returned from server")
      }
      setSession(selectedFile.name, selectedFile.size, parseMetadata(data.metadata))
    } catch (err) {
      console.error("Upload error:", err)
    }
  }

  return {
    uploadFile
  }
}

