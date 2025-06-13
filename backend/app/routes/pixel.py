import logging
from fastapi import APIRouter, Request, HTTPException, Form
from fastapi.responses import JSONResponse
import numpy as np
from ..session.actions import get_session_from_cookie
from ..services.aot_extractor import extract_pixel_intensities
from astropy.visualization import MinMaxInterval, ZScaleInterval, PercentileInterval
import json

router = APIRouter()

@router.post("/pixel/get-intensities")
async def getIntensities(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    print("Session info:", session)
    print("File path:", getattr(session, "file_path", None))


    form = await request.form()
    print("Received form values:", dict(form))
    interval_type = form.get("interval_type", "minmax")
    scale_type = form.get("scale_type", "linear")

    try:
        image = extract_pixel_intensities(session.file_path)
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        raise HTTPException(status_code=400, detail="Invalid image data format")

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

    def process_slice(slice_2d):
        modified = interval(slice_2d)
        return modified
    
    modified_image = np.array([process_slice(slice_2d) for slice_2d in image])
    
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

    result = np.array([apply_scale(slice_2d) for slice_2d in modified_image])
    return JSONResponse({"data": np.asarray(result).tolist()})