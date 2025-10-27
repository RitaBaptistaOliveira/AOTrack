from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
from ..session.actions import get_session_from_cookie
from ..utils import process_frame
import aotpy
import gc

router = APIRouter()

@router.post("/command/get-frame")
async def get_command_frame(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()

    loop_index = int(form.get("index", 0))
    frame_index = int(form.get("frame_index", 0))

    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        
        loops = system.loops
        if not (0 <= loop_index < len(loops)): 
            raise HTTPException(status_code=400, detail=f"loop_index {loop_index} out of range")

        loop = loops[loop_index]
        corrector = loop.commanded_corrector
        influence_function = corrector.influence_function.data
        n_actuators, x, y = influence_function.shape
        influence_matrix = influence_function.reshape(n_actuators, x * y)
        
        commands = loop.commands.data
        
        if not (0 <= frame_index < commands.shape[0]):
            raise HTTPException(status_code=400, detail=f"frame_index {frame_index} out of range")

        command_vector = commands[frame_index]
        image_flat = command_vector @ influence_matrix
        image_2d = image_flat.reshape(x, y)
        safe_array = [
            [None if np.isnan(x) else x for x in row]
            for row in image_2d.tolist()
        ]
        del system
        gc.collect()
    except Exception as e:
        print(f"AOSystem error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load frame")
    
    return JSONResponse({"frame": safe_array})

@router.post("/command/tile")
async def get_flat_tile_post(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()
    frame_start = int(form.get("frame_start"))
    frame_end = int(form.get("frame_end"))
    index_start = int(form.get("index_start"))
    index_end = int(form.get("index_end"))
    loop_index = int(form.get("index", 0))

    if frame_end <= frame_start:
        raise HTTPException(status_code=400, detail="Invalid frame range")
    if index_end <= index_start:
        raise HTTPException(status_code=400, detail="Invalid index range")

    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        
        loops = system.loops
        if not (0 <= loop_index < len(loops)): 
            raise HTTPException(status_code=400, detail=f"loop_index {loop_index} out of range")

        loop = loops[loop_index]
        
        commands = loop.commands.data
        n_frames = commands.shape[0]
        n_indexes = commands.shape[1]

        frame_end = min(frame_end, n_frames)
        index_end = min(index_end, n_indexes)

        sliced = commands[frame_start:frame_end, index_start:index_end]

        del system
        gc.collect()

        return JSONResponse({
            "tile": np.array(sliced).tolist(),
        })

    except Exception as e:
        print(f"Tile fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract tile")
    
@router.post("/command/get-meta")
async def get_command_meta(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()
    try:
        loop_index = int(form.get("loop_index", 0))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid loop format")

    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        loops = system.loops
        if not (0 <= loop_index < len(loops)): 
            raise HTTPException(status_code=400, detail=f"loop_index {loop_index} out of range")

        loop = loops[loop_index]
        corrector = loop.commanded_corrector
        influence_function = corrector.influence_function.data
        
        commands = loop.commands.data
        
        num_frames, num_index = commands.shape
        overall_min = float(np.min(commands))
        overall_max = float(np.max(commands))
        
        if hasattr(corrector, "influence_function") and corrector.influence_function is not None:
            influence_function = corrector.influence_function.data
            shape = influence_function.shape
            if len(shape) == 3:
                _, num_cols, num_rows = shape
                
            valid_pixel_mask = ~np.isnan(influence_function).all(axis=0)
                
            col_row_to_index = np.full(valid_pixel_mask.shape, -1, dtype=int)
            col_row_to_index[valid_pixel_mask] = np.arange(np.count_nonzero(valid_pixel_mask))

            # Build list: index -> [col, row]
            cols, rows = np.where(valid_pixel_mask)
            index_to_col_row = np.stack([cols, rows], axis=1).tolist()
            
            lookup_payload = {
            "col_row_to_index": col_row_to_index.tolist(),
            "index_to_col_row": index_to_col_row
            }
        
        del system
        gc.collect()

        response = {
            "num_frames": num_frames,
            "num_indices": num_index,
            "overall_min": overall_min,
            "overall_max": overall_max
        }
        if num_rows is not None and num_cols is not None and influence_function is not None:
            response["num_rows"] = num_rows
            response["num_cols"] = num_cols
            response["lookup"] = lookup_payload
            
        return JSONResponse(response)
    except Exception as e:
        print(f"Meta error: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract metadata")
    
@router.post("/command/get-default-stats")
async def get_default_values(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()
    loop_index = int(form.get("index", 0))

    try:
        system = aotpy.AOSystem.read_from_file(session.file_path)
        data = system.loops[loop_index].commands.data
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

#com col row, obter a evolucao do pupil pix por frame
@router.post("/command/get-point-timeseries")
async def get_command_point_timeseries(request: Request):
    session = await get_session_from_cookie(request)

    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()

    try:
        loop_index = int(form.get("index", 0))
        col = int(form.get("point_col"))
        row = int(form.get("point_row"))
        
        system = aotpy.AOSystem.read_from_file(session.file_path)
        print(system)
        loop = system.loops[loop_index]
        print(loop)
        corrector = loop.commanded_corrector
        print(corrector)
        influence_function = corrector.influence_function.data
        n_actuators, x, y = influence_function.shape
        print(influence_function.shape)
        print(n_actuators, x, y)
        influence_matrix = influence_function.reshape(n_actuators, x * y)
        
        commands = loop.commands.data
        print(commands.shape)
        pixel_index = col * x + row
        pixel_vector = influence_matrix[:, pixel_index]
        pixel_timeseries = commands @ pixel_vector
        
        del system
        gc.collect()
        
        contrib_stats = {
            "min": float(np.min(pixel_timeseries)),
            "max": float(np.max(pixel_timeseries)),
            "mean": float(np.mean(pixel_timeseries)),
            "median": float(np.median(pixel_timeseries)),
            "std": float(np.std(pixel_timeseries)),
            "variance": float(np.var(pixel_timeseries))
        }
        
        line_data = [{"x": int(i), "y": float(v)} for i, v in enumerate(pixel_timeseries)]

        return JSONResponse({
            "point_vals": line_data,
            "stats": contrib_stats
        })

    except Exception as e:
        print(f"Exception occurred: {e}")
        raise HTTPException(status_code=500, detail=f"Point stats error: {e}")
    
#com col, row e frame, obter o efeito de cada atuador nesse pixel nesse frame
@router.post("/command/get-point-contributions")
async def get_command_point_contributions(request: Request):
    session = await get_session_from_cookie(request)

    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()

    try:
        loop_index = int(form.get("index", 0))
        col = int(form.get("point_col"))
        row = int(form.get("point_row"))
        frame_index = int(form.get("frame_index", 0))
        
        system = aotpy.AOSystem.read_from_file(session.file_path)
        loop = system.loops[loop_index]
        corrector = loop.commanded_corrector
        influence_function = corrector.influence_function.data
        commands = loop.commands.data
        frame_commands = commands[frame_index]
        pixel_influence = influence_function[:, col, row]
        contributions = frame_commands * pixel_influence
        
        del system
        gc.collect()
        
        line_data = [{"x": int(i), "y": float(v)} for i, v in enumerate(contributions)]

        return JSONResponse({
            "point_vals": line_data,
            "stats": None
        })

    except Exception as e:
        print(f"Exception occurred: {e}")
        raise HTTPException(status_code=500, detail=f"Point stats error: {e}")

#com actuator index, obter a evolucao do valores desse atuador por frame
@router.post("/command/get-actuator-timeseries")
async def get_command_actuator_timeseries(request: Request):
    session = await get_session_from_cookie(request)

    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()

    try:
        loop_index = int(form.get("index", 0))
        actuator_index = int(form.get("actuator_index", 0))
        
        system = aotpy.AOSystem.read_from_file(session.file_path)
        loop = system.loops[loop_index]
        commands = loop.commands.data
        line_vals = commands[:, actuator_index]
        del system
        gc.collect()

        stats = {
            "min": float(np.min(line_vals)),
            "max": float(np.max(line_vals)),
            "mean": float(np.mean(line_vals)),
            "median": float(np.median(line_vals)),
            "std": float(np.std(line_vals)),
            "variance": float(np.var(line_vals)),
        }

        line_data = [{"x": int(i), "y": float(v)} for i, v in enumerate(line_vals)]

        return JSONResponse({
            "point_vals": line_data,
            "stats": stats
        })

    except Exception as e:
        print(f"Exception occurred: {e}")
        raise HTTPException(status_code=500, detail=f"Point stats error: {e}")
    
@router.post("/command/get-actuator-contribution")
async def get_command_actuator_contribution(request: Request):
    session = await get_session_from_cookie(request)

    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()

    try:
        loop_index = int(form.get("index", 0))
        actuator_index = int(form.get("actuator_index", 0))
        frame_index = int(form.get("frame_index", 0))
        
        system = aotpy.AOSystem.read_from_file(session.file_path)
        loop = system.loops[loop_index]
        corrector = loop.commanded_corrector
        influence_function = corrector.influence_function.data
        commands = loop.commands.data
        
        contribution_map = commands[frame_index, actuator_index] * influence_function[actuator_index, :, :]
        clean_contributions = [
            [float(x) if not np.isnan(x) else None for x in row]
            for row in contribution_map
        ]
        del system
        gc.collect()

        return JSONResponse({
            "point_vals": clean_contributions,
            "stats": None
        })

    except Exception as e:
        print(f"Exception occurred: {e}")
        raise HTTPException(status_code=500, detail=f"Point stats error: {e}")