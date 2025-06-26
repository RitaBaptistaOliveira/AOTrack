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
    interval_type = form.get("interval_type", "minmax")
    scale_type = form.get("scale_type", "linear")

    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        
        wfs_list = system.wavefront_sensors
        if not (0 <= wfs_index < len(wfs_list)):
            raise HTTPException(status_code=400, detail=f"wfs_index {wfs_index} out of range")
        
        sensor = system.wavefront_sensors[wfs_index]
        measurements = sensor.measurements.data
        subaperture_mask = sensor.subaperture_mask.data
        
        num_frames = measurements.shape[0]
        
        if not (0 <= frame_index < num_frames):
            raise HTTPException(status_code=400, detail=f"frame_index {frame_index} out of range")
        
        frame_measurements_x = measurements[frame_index, 0, :]  # X dimension (flat)
        frame_measurements_y = measurements[frame_index, 1, :]  # Y dimension (flat)
        
        output_x = np.full(subaperture_mask.shape, np.nan)
        row_indices, col_indices = np.where(subaperture_mask != -1)
        measurement_indices = subaperture_mask[row_indices, col_indices]
        output_x[row_indices, col_indices] = frame_measurements_x[measurement_indices]
        
        output_y = np.full(subaperture_mask.shape, np.nan)
        output_y[row_indices, col_indices] = frame_measurements_y[measurement_indices]
        
        processed_x, _, _ = process_frame(scale_type, interval_type, output_x)
        processed_y, _, _ = process_frame(scale_type, interval_type, output_y)
        
        del system
        gc.collect()
    except Exception as e:
        print(f"AOSystem error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load frame")
    
    return JSONResponse({
        "x_frame": processed_x.tolist(),
        "y_frame": processed_y.tolist()
        })

@router.post("/slope/flat-tile")
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
        
        x_measurements = measurements[:, 0, :]  # shape [frames, indices]
        y_measurements = measurements[:, 1, :]  # shape [frames, indices]
        
        num_frames, num_cols, num_rows = x_measurements.shape

        frame_end = min(frame_end, num_frames)
        index_end = min(index_end, num_cols * num_rows)

        x_tile_data = []
        y_tile_data = []

        for frame in range(frame_start, frame_end):
            x_sliced = x_measurements[frame, index_start:index_end]
            y_sliced = y_measurements[frame, index_start:index_end]
            x_tile_data.append(x_sliced.tolist())
            y_tile_data.append(y_sliced.tolist())

        del system
        gc.collect()

        return JSONResponse({
            "x_tile": x_tile_data,
            "y_tile": y_tile_data
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
        if not (0 <= wfs_index < len(wfs_list)):
            raise HTTPException(status_code=400, detail=f"wfs_index {wfs_index} out of range")

        measurements = wfs_list[wfs_index].measurements.data
        num_frames, _, num_indices = measurements.shape
        overall_min = float(np.min(measurements))
        overall_max = float(np.max(measurements))
        
        del system
        gc.collect()

        return JSONResponse({
            "num_frames": num_frames,
            "num_indices": num_indices,
            "overall_min": overall_min,
            "overall_max": overall_max
        })

    except Exception as e:
        print(f"Meta error: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract metadata")
    
@router.post("/slope/get-default-slope-charts")
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
    
        mean_x = np.mean(x, axis=1)
        mean_y = np.mean(y, axis=1)
        
        frame_means_x = [{"x": int(i), "y": float(v)} for i, v in enumerate(mean_x)]
        frame_means_y = [{"x": int(i), "y": float(v)} for i, v in enumerate(mean_y)]
        
        return JSONResponse({
            "frame_means_x": frame_means_x,
            "frame_means_y": frame_means_y,
            "min": float(np.min(measurements)),
            "max": float(np.max(measurements)),
            "mean": float(np.mean(measurements)),
            "median": float(np.median(measurements)),
            "std": float(np.std(measurements)),
            "variance": float(np.var(measurements)),
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
        dimension = int(form.get("dimension", 0))

        system = aotpy.AOSystem.read_from_file(session.file_path)
        measurements = system.wavefront_sensors[wfs_index].measurements.data
        
        del system
        gc.collect()

        # Extract intensity time series for this (col, row)
        intensities = measurements[:, dimension, index]

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


@router.post("/slope/get-histogram")
async def get_slope_histogram(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()
    wfs_index = int(form.get("wfs_index", 0))
    num_bins = int(form.get("num_bins", 30))

    index = int(form.get("index"))
    dimension = int(form.get("dimension", 0))
    point_selected = index is not None and dimension is not None

    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        measurements = system.wavefront_sensors[wfs_index].measurements.data
        x = measurements[:, 0, :].flatten()
        y = measurements[:, 1, :].flatten()
        
        del system
        gc.collect()

        if point_selected:
            values = measurements[:, dimension, index]
            counts_p, bins_p = np.histogram(values, bins=num_bins, range=[np.min(measurements), np.max(measurements)])
        else:
            counts_p = np.ndarray([])
            bins_p = np.ndarray([])
            
        counts_x, bins_x = np.histogram(x, bins=num_bins, range=[np.min(measurements), np.max(measurements)])
        counts_y, bins_y = np.histogram(y, bins=num_bins, range=[np.min(measurements), np.max(measurements)])

        
        return JSONResponse({
            "counts_x": counts_x.tolist(),
            "bins_x": bins_x.tolist(),
            "counts_y": counts_y.tolist(),
            "bins_y": bins_y.tolist(),
            "counts1" : counts_p.tolist(),
            "bins1" : bins_p.tolist(),
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Histogram error: {e}")