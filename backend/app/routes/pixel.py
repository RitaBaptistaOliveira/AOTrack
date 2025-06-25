from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
from ..session.actions import get_session_from_cookie
from ..utils import get_interval, get_scale
import aotpy
import gc

router = APIRouter()

@router.post("/pixel/get-frames")
async def get_pixel_frames(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    # Get form data
    form = await request.form()
    interval_type = form.get("interval_type", "minmax")
    scale_type = form.get("scale_type", "linear")
    wfs_index = int(form.get("wfs_index", 0))

    # Read from session file and get the pixel intensities for the correct wavefront sensor
    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        wfs_list = system.wavefront_sensors
        if not wfs_list:
            raise RuntimeError("No wavefront sensors in AOSystem.")
        
        if not (0 <= wfs_index < len(wfs_list)):
            raise HTTPException(status_code=400, detail=f"wfs_index {wfs_index} out of range (0 to {len(wfs_list) - 1})")
        
        image = wfs_list[wfs_index].detector.pixel_intensities.data
        del system
        gc.collect()
        
    except Exception as e:
        print(f"Error reading AOSystem FITS: {e}")
        raise HTTPException(status_code=500, detail="Failed to read FITS file")

    # Get the interval and scale
    interval = get_interval(interval_type)
    scale_func = get_scale(scale_type)

    # Apply to the frames
    try:
        result = np.array([scale_func(interval(frame)) for frame in image])
    except Exception as e:
        print(f"Transform failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to apply interval or scale")

    return JSONResponse({"data": result.tolist()})

@router.post("/pixel/get-frame")
async def get_pixel_frame(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()
    try:
        wfs_index = int(form.get("wfs_index", 0))
        frame_index = int(form.get("frame_index", 0))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid index format")

    interval_type = form.get("interval_type", "minmax")
    scale_type = form.get("scale_type", "linear")

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
    
    interval = get_interval(interval_type)
    scale_func = get_scale(scale_type)
    
    
    try:
        transformed = np.array(scale_func(interval(frame)))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transform error: {e}")
    except Exception as e:
        print(f"AOSystem error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load frame")
    
    return JSONResponse({"frame": transformed.tolist()})

@router.post("/pixel/get-frame-range")
async def get_pixel_frame_range(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()
    try:
        wfs_index = int(form.get("wfs_index", 0))
        start_frame = int(form.get("start_frame", 0))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid index format")

    interval_type = form.get("interval_type", "minmax")
    scale_type = form.get("scale_type", "linear")
    frame_count = 10  # Fixed chunk size

    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        wfs_list = system.wavefront_sensors
        if not (0 <= wfs_index < len(wfs_list)):
            raise HTTPException(status_code=400, detail=f"wfs_index {wfs_index} out of range")

        data = wfs_list[wfs_index].detector.pixel_intensities.data
        end_frame = min(start_frame + frame_count, data.shape[0])
        if not (0 <= start_frame < end_frame <= data.shape[0]):
            raise HTTPException(status_code=400, detail=f"frame range {start_frame}-{end_frame} out of bounds")

        frame_slice = data[start_frame:end_frame]
        del system
        gc.collect()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read frames: {e}")

    interval = get_interval(interval_type)
    scale_func = get_scale(scale_type)

    try:
        transformed_frames = [scale_func(interval(frame)) for frame in frame_slice]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transform failed: {e}")

    return JSONResponse({
        "frames": [np.array(frame).tolist() for frame in transformed_frames],
        "start_frame": start_frame,
        "end_frame": end_frame - 1
    })
    
@router.post("/pixel/flat-tile")
async def get_flat_tile_post(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()
    
    print(form)
    try:
        frame_start = int(form.get("frame_start"))
        frame_end = int(form.get("frame_end"))
        index_start = int(form.get("index_start"))
        index_end = int(form.get("index_end"))
        wfs_index = int(form.get("wfs_index", 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid or missing parameters")

    if frame_end <= frame_start:
        raise HTTPException(status_code=400, detail="Invalid frame range")
    if index_end <= index_start:
        raise HTTPException(status_code=400, detail="Invalid index range")

    try:
        import aotpy
        system = aotpy.AOSystem.read_from_file(session.file_path)
        wfs_list = system.wavefront_sensors
        if not (0 <= wfs_index < len(wfs_list)):
            raise HTTPException(status_code=400, detail=f"wfs_index {wfs_index} out of range")

        data3d = wfs_list[wfs_index].detector.pixel_intensities.data  # shape is [frame][col][row]
        num_frames, num_cols, num_rows = data3d.shape
        print(num_frames, num_cols, num_rows)
        frame_end = min(frame_end, num_frames)
        index_end = min(index_end, num_cols * num_rows)

        tile_data = []
        for frame in range(frame_start, frame_end):
            flat = [
                data3d[frame][col][row]
                for col in range(num_cols)
                for row in range(num_rows)
            ]
            sliced = flat[index_start:index_end]
            tile_data.append(np.array(sliced))

        del system
        gc.collect()

        return JSONResponse({
            "tile": np.array(tile_data).tolist(),
            "frame_start": frame_start,
            "frame_end": frame_end,
            "index_start": index_start,
            "index_end": index_end,
            "num_frames": num_frames,
            "num_cols": num_cols,
            "num_rows": num_rows
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