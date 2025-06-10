import logging
from fastapi import APIRouter, Request, HTTPException, Form
from fastapi.responses import JSONResponse
import numpy as np
from ..session.actions import get_session_from_cookie
from ..services.aot_extractor import extract_pixel_intensities
from astropy.visualization import MinMaxInterval, ZScaleInterval, PercentileInterval
import json

router = APIRouter()

@router.get("/pixel/intensities")
async def get_pixel_intensities(request: Request):
    session = await get_session_from_cookie(request)
    if session is None or session.file_path is None:
        raise HTTPException(status_code=400, detail="No active session or file path")

    try:
        frames = extract_pixel_intensities(session.file_path)
        frames = frames.tolist()

        return JSONResponse({"frames": frames})

    except Exception as e:
        logging.error(f"Error extracting pixel intensities: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to extract pixel intensities")

@router.post("/pixel/apply-changes")
async def apply_pixel_changes(request: Request):
    form = await request.form()
    image_json = form.get("data")
    if not image_json:
        raise HTTPException(status_code=400, detail="Image parameter is required")
    try:
        image = np.array(json.loads(image_json))
    except Exception:
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
            raise HTTPException(status_code=400, detail=f'Invalid interval: {interval_type}')

    modified_image = interval(image)

    scale_type = form.get("scale_type", "linear")
    match scale_type.lower():
        case 'linear':
            result = modified_image
        case 'log':
            result = np.log1p(modified_image)
        case 'pow':
            result = np.power(modified_image, 2)
        case 'sqrt':
            result = np.sqrt(modified_image)
        case 'squared':
            result = np.square(modified_image)
        case 'asinh':
            result = np.arcsinh(modified_image)
        case 'sinh':
            result = np.sinh(modified_image)
        case 'histogram equalization':
            img_array = np.array(modified_image)
            histogram, bins = np.histogram(img_array.flatten(), bins=256, density=True)
            cdf = histogram.cumsum()
            cdf = 255 * cdf / cdf[-1]
            image_equalized = np.interp(img_array.flatten(), bins[:-1], cdf)
            result = image_equalized.reshape(img_array.shape)
        case 'logexp':
            result = np.exp(modified_image)
        case _:
            raise HTTPException(status_code=400, detail=f'Invalid scale: {scale_type}')

    return JSONResponse({"data": np.asarray(result).tolist()})