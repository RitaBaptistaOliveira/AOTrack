import type { MetadataSummary } from "../types/metadata_summary";
import { useAoSession } from "../contexts/ao-session-context";

export function useAoHelper() {

     const {setSession} = useAoSession();

    const uploadFile = async (selectedFile: File) => {
        if (!selectedFile.name.endsWith(".fits")) {
            throw new Error("Only .fits files are allowed");
        }
        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await fetch("http://localhost:8000/upload", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();
            if (!data.metadata) {
                throw new Error("No metadata returned from server");
            }
            setSession(selectedFile.name, selectedFile.size, parseMetadata(data.metadata));
        } catch (err) {
            console.error("Upload error:", err);
        }
    };

    const fetchSession = async () => {
        try {
            const response = await fetch("http://localhost:8000/session", {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) throw new Error("Session fetch failed");

            const data = await response.json();
            return data.active;

        } catch (err) {
            console.error("Fetch session error:", err);
        }
    }

    // const fetchMetadata = async () => {
    //     const active = fetchSession();
    //     if (!active) {
    //         console.warn("No active session found");
    //         return;
    //     }
    //     else {
    //         try {
    //             const response = await fetch(`http://localhost:8000/metadata/${file.name}`, {
    //                 credentials: "include",
    //             });

    //             if (!response.ok) throw new Error("Failed to fetch metadata");

    //             const data = await response.json();
    //             setMetadata(data);
    //         } catch (err) {
    //             console.error("Fetch metadata error:", err);
    //         }
    //     }

    // };

    return {
        uploadFile,
        fetchSession,
    };
}

function parseMetadata(raw: any): MetadataSummary {
  return {
    telescope_name: raw.telescope_name ?? null,
    system_name: raw.system_name ?? null,
    mode: raw.mode ?? null,
    start_date: raw.start_date ?? null,
    end_date: raw.end_date ?? null,
    recording_time: raw.recording_time ?? null,
    strehl_ratio: raw.strehl_ratio ?? null,
    config: raw.config ?? null,
    strehl_wavelength: raw.strehl_wavelength ?? null,

    num_params: raw.num_params ?? 0,
    atmospheric_parameters: (raw.atmospheric_parameters ?? []).map((ap: any) => ({
      uid: ap.uid,
      time: ap.time
        ? {
            timestamps: ap.time.timestamps,
            frame_numbers: ap.time.frame_numbers,
          }
        : null,
    })),

    num_wfs: raw.num_wfs ?? 0,
    wavefront_sensors: (raw.wavefront_sensors ?? []).map((wfs: any) => ({
      uid: wfs.uid,
      source: wfs.source ? { uid: wfs.source.uid } : null,
      n_valid_subapertures: wfs.n_valid_subapertures,
      subaperture_size: wfs.subaperture_size,
      wavelength: wfs.wavelength,
    })),

    num_correctors: raw.num_correctors ?? 0,
    wavefront_correctors: (raw.wavefront_correctors ?? []).map((wfc: any) => ({
      uid: wfc.uid,
      telescope: wfc.telescope ?? null,
      n_valid_actuators: wfc.n_valid_actuators,
    })),

    num_loops: raw.num_loops ?? 0,
    loops: (raw.loops ?? []).map((loop: any) => ({
      uid: loop.uid,
      wfc: loop.wfc ?? null,
      closed: loop.closed,
      time: loop.time
        ? {
            timestamps: loop.time.timestamps,
            frame_numbers: loop.time.frame_numbers,
          }
        : null,
      framerate: loop.framerate,
      delay: loop.delay,
    })),

    num_sources: raw.num_sources ?? 0,
    sources: (raw.sources ?? []).map((src: any) => ({
      uid: src.uid,
    })),
  };
}