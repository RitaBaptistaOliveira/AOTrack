from dataclasses import asdict
from datetime import datetime
import gc
import aotpy
from numpy import ndarray, reshape

def extract_metadata_from_file(path: str) -> dict:
    try:
        system = aotpy.AOSystem.read_from_file(path)
    except Exception as e:
        raise RuntimeError(f"Failed to read AOSystem from file: {e}")
    
    def fmt(dt: datetime | None) -> str | None:
        return dt.isoformat() if dt else None

    metadata = {
        "telescope_name": system.main_telescope.uid,
        "system_name": system.name,
        "mode": system.ao_mode,
        "start_date": fmt(system.date_beginning),
        "end_date": fmt(system.date_end),
        "recording_time": (
            (system.date_end - system.date_beginning).total_seconds()
            if system.date_beginning and system.date_end
            else None
        ),
        "strehl_ratio": system.strehl_ratio,
        "config": system.config,
        "strehl_wavelength": system.strehl_wavelength,
        
        "num_params": len(system.atmosphere_params),
        "atmospheric_parameters": [
            {
                "uid": ap.uid,
                "time": asdict(ap.time) if ap.time else None
            }
            for ap in system.atmosphere_params
        ],
        
        "num_wfs": len(system.wavefront_sensors),
        "wavefront_sensors": [
            {
                "uid": wfs.uid,
                "source": wfs.source.uid if wfs.source else None,
                "n_valid_subapertures": int(wfs.n_valid_subapertures) if wfs.n_valid_subapertures else None,
                "subaperture_size": float(wfs.subaperture_size) if wfs.subaperture_size else None,
                "wavelength": float(wfs.wavelength) if wfs.wavelength else None,
            }
            for wfs in system.wavefront_sensors
        ],
        
        "num_correctors": len(system.wavefront_correctors),
        "wavefront_correctors": [
            {
                "uid": wfc.uid,
                "telescope": wfc.telescope.uid if wfc.telescope else None,
                "n_valid_actuators": int(wfc.n_valid_actuators) if wfc.n_valid_actuators else None,
            }
            for wfc in system.wavefront_correctors
        ],
        
        "num_loops": len(system.loops),
        "loops": [
            {
                "uid": loop.uid,
                "wfc": loop.commanded_corrector.uid if loop.commanded_corrector else None,
                "closed": loop.closed,
                "time": asdict(loop.time) if loop.time else None,
                "framerate": loop.framerate,
                "delay": loop.delay,
            }
            for loop in system.loops
        ],
        "num_sources": len(system.sources),
        "sources": [
            {
                "uid": src.uid
            }
            for src in system.sources
        ],
    }
    del system
    gc.collect()
    return metadata

# TODO: better error handling and missing data checks
def extract_pixel_intensities(path: str) -> ndarray:
    
    try:
        system = aotpy.AOSystem.read_from_file(path)
    except Exception as e:
        raise RuntimeError(f"Failed to read AOSystem from file: {e}")


    frames = system.wavefront_sensors[0].detector.pixel_intensities.data if system.wavefront_sensors else None
    del system
    gc.collect()
    return frames

def extract_commands(path: str) -> tuple:
    try:
        system = aotpy.AOSystem.read_from_file(path)
    except Exception as e:
        raise RuntimeError(f"Failed to read AOSystem from file: {e}")

    loop = system.loops[0]
    command_data = loop.commands.data
    corrector_type = type(loop.commanded_corrector).__name__
    
    
    if (corrector_type == "DeformableMirror"):
        influence_function = loop.commanded_corrector.influence_function
        if influence_function is None:
            del system
            gc.collect()
            return command_data, None
        n_act, x, y = influence_function.shape
        
        # Step 1: Reshape mask to (n_act, x*y)
        if_flat = influence_function.reshape(n_act, -1)  # shape: (n_act, x*y)

        # Step 2: Matrix multiplication
        combined = command_data @ if_flat  # shape: (n_frames, x*y)

        # Step 3: Reshape back to (n_frames, x, y)
        del system
        gc.collect()
        return command_data, combined.reshape(-1, x, y)
    
    del system
    gc.collect()
    return command_data, None