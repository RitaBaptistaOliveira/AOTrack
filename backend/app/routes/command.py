import logging
from fastapi import APIRouter, Request, HTTPException, Form
from fastapi.responses import JSONResponse
import numpy as np
from ..session.actions import get_session_from_cookie
from ..services.aot_extractor import extract_commands
from astropy.visualization import MinMaxInterval, ZScaleInterval, PercentileInterval
import json

router = APIRouter()

@router.post("/command/get-commands")
async def getCommands(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    form = await request.form()
    
    interval_type = form.get("interval_type", "minmax")
    scale_type = form.get("scale_type", "linear")
    
    try:
        flat_image, image  = extract_commands(session.file_path)
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        raise HTTPException(status_code=400, detail="Invalid image data format")
    
    if image is None:
        return JSONResponse({"original_data": np.asarray(flat_image).tolist(), "multiplied_data": None})

    interval_type = form.get("interval_type", "minmax")

    match interval_type:
        case "minmax":
            interval = MinMaxInterval()
        case "zscale":
            interval = ZScaleInterval(n_samples=1000, contrast=0.25, max_reject=0.5, min_npixels=5, krej=2.5, max_iterations=5)
        case "percentile":
            interval = PercentileInterval(30.)  # TODO add a changing percentile value
        case _:
            print(f'Invalid interval: {interval_type}')
            raise HTTPException(status_code=400, detail=f'Invalid interval: {interval_type}')

    modified_image = interval(image)
    
    scale_type = form.get("scale_type", "linear")
    def apply_scale(arr):
        match scale_type:
            case 'linear':
                return arr
            case 'log':
                return np.log1p(arr)
            case 'pow':
                return np.power(arr, 2)
            case 'sqrt':
                return np.sqrt(arr)
            case 'squared':
                return np.square(arr)
            case 'asinh':
                return np.arcsinh(arr)
            case 'sinh':
                return np.sinh(arr)
            case 'histogram equalization':
                histogram, bins = np.histogram(arr.flatten(), bins=256, density=True)
                cdf = histogram.cumsum()
                cdf = 255 * cdf / cdf[-1]
                return np.interp(arr.flatten(), bins[:-1], cdf).reshape(arr.shape)
            case 'logexp':
                return np.exp(arr)
            case _:
                print(f'Invalid scale: {scale_type}')
                raise HTTPException(status_code=400, detail=f'Invalid scale: {scale_type}')

    result = apply_scale(modified_image)
    return JSONResponse({"original_data": np.asarray(flat_image).tolist(), "multiplied_data": np.asarray(result).tolist()})