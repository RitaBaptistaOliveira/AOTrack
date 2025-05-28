
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ..session.actions import get_session_from_cookie, update_session


router = APIRouter()

@router.get("/session")
async def check_session(request: Request):
    session = await get_session_from_cookie(request)
    if session is not None:
        await update_session(session)
        return JSONResponse({"active": True})
    else: return JSONResponse({"active": False})
        