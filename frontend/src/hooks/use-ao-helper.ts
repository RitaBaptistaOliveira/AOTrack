import { useAoSession } from "../contexts/ao-session-context"
import { parseMetadata } from "@/utils"

/**
 * Custom hook providing helper functions for Adaptive Optics (AO) dashboard operations.
 *
 * Currently includes utilities for uploading `.fits` telemetry files to the backend
 * and automatically updating the AO session context with the returned metadata.
 *
 * @returns An object containing AO helper functions.
 */
export function useAoHelper() {

  const { setSession } = useAoSession()

  /**
   * Uploads a `.fits` file to the AO backend server and updates the session context.
   *
   * This function:
   * 1. Validates that the file has a `.fits` extension.
   * 2. Sends the file via a `POST` request to the `/upload` endpoint.
   * 3. Expects metadata in the server's JSON response.
   * 4. Parses the metadata and sets the AO session with file details.
   *
   * @async
   * @param selectedFile - The `.fits` file to upload.
   * @throws {Error} If the file is not a `.fits` file, the upload fails, or no metadata is returned.
   */
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

