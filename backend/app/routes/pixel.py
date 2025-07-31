from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
from ..session.actions import get_session_from_cookie
import aotpy
import gc

router = APIRouter()

@router.post("/pixel/get-frame")
async def get_pixel_frame(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()

    wfs_index = int(form.get("wfs_index", 0))
    frame_index = int(form.get("frame_index", 0))

    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        
        wfs_list = system.wavefront_sensors
        if not (0 <= wfs_index < len(wfs_list)):
            raise HTTPException(status_code=400, detail=f"wfs_index {wfs_index} out of range")

        data = wfs_list[wfs_index].detector.pixel_intensities.data
        if not (0 <= frame_index < data.shape[0]):
            raise HTTPException(status_code=400, detail=f"frame_index {frame_index} out of range")

        frame = data[frame_index]
    
        del system
        gc.collect()
    except Exception as e:
        print(f"AOSystem error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load frame")
    
    return JSONResponse({"frame": frame.tolist()})

@router.post("/pixel/tile")
async def get_flat_tile_post(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()
    frame_start = int(form.get("frame_start"))
    frame_end = int(form.get("frame_end"))
    index_start = int(form.get("index_start"))
    index_end = int(form.get("index_end"))
    wfs_index = int(form.get("wfs_index", 0))

    if frame_end <= frame_start:
        raise HTTPException(status_code=400, detail="Invalid frame range")
    if index_end <= index_start:
        raise HTTPException(status_code=400, detail="Invalid index range")

    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        
        wfs_list = system.wavefront_sensors
        if not (0 <= wfs_index < len(wfs_list)):
            raise HTTPException(status_code=400, detail=f"wfs_index {wfs_index} out of range")

        data3d = wfs_list[wfs_index].detector.pixel_intensities.data  # shape is [frame][col][row]
        
        num_frames, num_cols, num_rows = data3d.shape

        frame_end = min(frame_end, num_frames)
        index_end = min(index_end, num_cols * num_rows)
        
        flat_indices = np.arange(index_start, index_end)
        cols = flat_indices // num_rows
        rows = flat_indices % num_rows
        valid_mask = (cols < num_cols) & (rows < num_rows)
        cols = cols[valid_mask]
        rows = rows[valid_mask]
        frame_range = np.arange(frame_start, frame_end)
        sliced = data3d[frame_range[:, None], cols[None, :], rows[None, :]]
        del system
        gc.collect()

        return JSONResponse({
            "tile": sliced.tolist(),
        })

    except Exception as e:
        print(f"Tile fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract tile")
    
@router.post("/pixel/get-meta")
async def get_pixel_meta(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()
    try:
        wfs_index = int(form.get("wfs_index", 0))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid wfs_index format")

    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        wfs_list = system.wavefront_sensors
        if not (0 <= wfs_index < len(wfs_list)):
            raise HTTPException(status_code=400, detail=f"wfs_index {wfs_index} out of range")

        data = wfs_list[wfs_index].detector.pixel_intensities.data
        num_frames, num_cols, num_rows = data.shape
        overall_min = float(np.min(data))
        overall_max = float(np.max(data))
        
        del system
        gc.collect()

        return JSONResponse({
            "num_frames": num_frames,
            "num_cols": num_cols,
            "num_rows": num_rows,
            "overall_min": overall_min,
            "overall_max": overall_max
        })

    except Exception as e:
        print(f"Meta error: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract metadata")
    
@router.post("/pixel/get-default-stats")
async def get_default_values(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()
    wfs_index = int(form.get("wfs_index", 0))

    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        data = system.wavefront_sensors[wfs_index].detector.pixel_intensities.data
        del system
        gc.collect()
        return JSONResponse({
            "min": float(np.min(data)),
            "max": float(np.max(data)),
            "mean": float(np.mean(data)),
            "median": float(np.median(data)),
            "std": float(np.std(data)),
            "variance": float(np.var(data)),
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Histogram error: {e}")
    
@router.post("/pixel/get-point-stats")
async def get_pixel_point_stats(request: Request):
    session = await get_session_from_cookie(request)

    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()

    try:
        wfs_index = int(form.get("wfs_index", 0))
        col = int(form.get("col"))
        row = int(form.get("row"))

        system = aotpy.AOSystem.read_from_file(session.file_path)
        data = system.wavefront_sensors[wfs_index].detector.pixel_intensities.data

        del system
        gc.collect()

        # Extract intensity time series for this (col, row)
        intensities = data[:, col, row]

        stats = {
            "min": float(np.min(intensities)),
            "max": float(np.max(intensities)),
            "mean": float(np.mean(intensities)),
            "median": float(np.median(intensities)),
            "std": float(np.std(intensities)),
            "variance": float(np.var(intensities)),
        }

        line_data = [{"x": int(i), "y": float(v)} for i, v in enumerate(intensities)]

        return JSONResponse({
            "point_means": line_data,
            "stats": stats
        })

    except Exception as e:
        print(f"Exception occurred: {e}")
        raise HTTPException(status_code=500, detail=f"Point stats error: {e}")
