from fastapi import HTTPException
import numpy as np
from astropy.visualization import MinMaxInterval, ZScaleInterval, PercentileInterval

def get_scale(scale_type):
    match scale_type:
        case 'linear':
            scale_func = lambda arr: arr
        case 'log':
            scale_func = lambda arr: np.log1p(arr)
        case 'pow':
            scale_func = lambda arr: np.power(arr, 2)
        case 'sqrt':
            scale_func = lambda arr: np.sqrt(arr)
        case 'squared':
            scale_func = lambda arr: np.square(arr)
        case 'asinh':
            scale_func = lambda arr: np.arcsinh(arr)
        case 'sinh':
            scale_func = lambda arr: np.sinh(arr)
        case 'histogram equalization':
            def scale_func(arr):
                histogram, bins = np.histogram(arr.flatten(), bins=256, density=True)
                cdf = histogram.cumsum()
                cdf = 255 * cdf / cdf[-1]
                return np.interp(arr.flatten(), bins[:-1], cdf).reshape(arr.shape)
        case 'logexp':
            scale_func = lambda arr: np.exp(arr)
        case _:
            raise HTTPException(status_code=400, detail=f"Invalid scale: {scale_type}")
    return scale_func

def get_interval(interval_type):
    match interval_type:
        case "minmax":
            return MinMaxInterval()
        case "zscale":
            return ZScaleInterval(n_samples=1000, contrast=0.25, max_reject=0.5, min_npixels=5, krej=2.5, max_iterations=5)
        case "percentile":
            return PercentileInterval(30.)  # TODO add a changing percentile value
        case _:
            print(f'Invalid interval: {interval_type}')
            raise HTTPException(status_code=400, detail=f'Invalid interval: {interval_type}')
        
def process_frame(scale_type, interval_type, frame_data):
    interval = get_interval(interval_type)
    vmin, vmax = interval.get_limits(frame_data)
    clipped = np.clip(frame_data, vmin, vmax)
    
    # normalized = interval(frame_data)
    
    scale_func = get_scale(scale_type)
    scaled = scale_func(clipped)
    # scaled = scale_func(normalized)
    
    return scaled, vmin, vmax