from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
from ..session.actions import get_session_from_cookie
from ..utils import process_frame
import aotpy
import gc

router = APIRouter()

@router.post("/slope/get-frame")
async def get_slope_frame(request: Request):
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
        
        sensor = system.wavefront_sensors[wfs_index]
        measurements = sensor.measurements.data
        subaperture_mask = sensor.subaperture_mask.data
        if not (0 <= frame_index < measurements.shape[0]):
            raise HTTPException(status_code=400, detail=f"frame_index {frame_index} out of range")
        
        measurements_x = measurements[frame_index, 0, :]  # X dimension (flat)
        measurements_y = measurements[frame_index, 1, :]  # Y dimension (flat)
        row_indices, col_indices = np.where(subaperture_mask != -1)
        measurement_indices = subaperture_mask[row_indices, col_indices]
        outputX = np.full(subaperture_mask.shape, np.nan)
        outputX[row_indices, col_indices] = measurements_x[measurement_indices]
        outputX = np.where(np.isnan(outputX), None, outputX)
        
        outputY = np.full(subaperture_mask.shape, np.nan)
        outputY[row_indices, col_indices] = measurements_y[measurement_indices]
        outputY = np.where(np.isnan(outputY), None, outputY)
        
        del system
        gc.collect()
    except Exception as e:
        print(f"AOSystem error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load frame")
    
    return JSONResponse({
        "frameX": outputX.tolist(),
        "frameY": outputY.tolist()
    })

@router.post("/slope/tile")
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

        measurements = wfs_list[wfs_index].measurements.data
        
        x_measurements = measurements[:, 0, :]
        y_measurements = measurements[:, 1, :]
                
        num_frames, num_index = x_measurements.shape

        frame_end = min(frame_end, num_frames)
        index_end = min(index_end, num_index)

        x_sliced = x_measurements[frame_start:frame_end, index_start:index_end]
        y_sliced = y_measurements[frame_start:frame_end, index_start:index_end]

        del system
        gc.collect()

        return JSONResponse({
            "tiles": [x_sliced.tolist(), y_sliced.tolist()]
        })
    except Exception as e:
        print(f"Tile fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract tile")
    
@router.post("/slope/get-meta")
async def get_slope_meta(request: Request):
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
        sensor = wfs_list[wfs_index]
        if not (0 <= wfs_index < len(wfs_list)):
            raise HTTPException(status_code=400, detail=f"wfs_index {wfs_index} out of range")

        measurements = sensor.measurements.data
        num_frames, dim, num_indices = measurements.shape
        overall_min = float(np.min(measurements))
        overall_max = float(np.max(measurements))
        num_rows = None
        num_cols = None
        subaperture_mask = None
        if hasattr(sensor, "subaperture_mask") and sensor.subaperture_mask is not None:
            subaperture_mask = sensor.subaperture_mask.data
            mask_shape = subaperture_mask.shape
            if len(mask_shape) == 2:
                num_cols, num_rows = mask_shape
        
        del system
        gc.collect()
        
        response = {
            "num_frames": num_frames,
            "num_indices": num_indices,
            "dim": dim,
            "overall_min": overall_min,
            "overall_max": overall_max
        }
        
        if num_rows is not None and num_cols is not None and subaperture_mask is not None:
            response["num_rows"] = num_rows
            response["num_cols"] = num_cols
            response["subaperture_mask"] = sensor.subaperture_mask.data.tolist()

        return JSONResponse(response)

    except Exception as e:
        print(f"Meta error: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract metadata")
    
@router.post("/slope/get-default-stats")
async def get_default_values(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()
    wfs_index = int(form.get("wfs_index", 0))

    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        measurements = system.wavefront_sensors[wfs_index].measurements.data
        x = measurements[:, 0, :]
        y = measurements[:, 1, :]

        del system
        gc.collect()
        
        return JSONResponse({
            "min": [float(np.min(x)), float(np.min(y))],
            "max": [float(np.max(x)), float(np.max(y))],
            "mean": [float(np.mean(x)), float(np.mean(y))],
            "median": [float(np.median(x)), float(np.median(y))],
            "std": [float(np.std(x)), float(np.std(y))],
            "variance": [float(np.var(x)), float(np.var(y))],
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Histogram error: {e}")
    
@router.post("/slope/get-point-stats")
async def get_slope_point_stats(request: Request):
    session = await get_session_from_cookie(request)

    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()

    try:
        wfs_index = int(form.get("wfs_index", 0))
        index = int(form.get("index"))

        system = aotpy.AOSystem.read_from_file(session.file_path)
        measurements = system.wavefront_sensors[wfs_index].measurements.data
        
        del system
        gc.collect()

        intensitiesX = measurements[:, 0, index]
        intensitiesY = measurements[:, 1, index]
        
        stats = {
            "min": [float(np.min(intensitiesX)),float(np.min(intensitiesY))],
            "max": [float(np.max(intensitiesX)), float(np.max(intensitiesY))],
            "mean": [float(np.mean(intensitiesX)), float(np.mean(intensitiesY))],
            "median": [float(np.median(intensitiesX)), float(np.median(intensitiesY))],
            "std": [float(np.std(intensitiesX)), float(np.std(intensitiesY))],
            "variance": [float(np.var(intensitiesX)), float(np.var(intensitiesY))],
        }

        line_dataX = [{"x": int(i), "y": float(v)} for i, v in enumerate(intensitiesX)]
        line_dataY = [{"x": int(i), "y": float(v)} for i, v in enumerate(intensitiesY)]

        return JSONResponse({
            "point_means": [line_dataX, line_dataY],
            "stats": stats
        })

    except Exception as e:
        print(f"Exception occurred: {e}")
        raise HTTPException(status_code=500, detail=f"Point stats error: {e}")
