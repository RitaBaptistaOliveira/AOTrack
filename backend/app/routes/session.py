
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ..session.actions import get_session, update_session_timestamp, attach_session_cookie


router = APIRouter()

@router.get("/session")
async def check_session(request: Request):
    session_id = request.cookies.get("ao_session")
    session = await get_session(session_id)
    if session is not None:
        updated_session = await update_session_timestamp(session_id)
        if updated_session is None:
            response = JSONResponse({"active": False, "error": "Failed to update session timestamp"})
            return response
        return {"active": True, "session_id": session_id}
    else:
        response = JSONResponse({"active": True})
        attach_session_cookie(response, session_id)
        return response
        