from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ..services.aot_extractor import extract_metadata_from_file

from ..session.actions import get_session_from_cookie, update_session

router = APIRouter()

@router.get("/session")
async def check_session(request: Request):
    session = await get_session_from_cookie(request)
    if session is not None:
        await update_session(session)
        metadata = extract_metadata_from_file(session.file_path)
        return JSONResponse({"metadata": metadata})
    else: return JSONResponse({"active": False})
        