from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
import tempfile
import shutil
from ..session.manager import SESSION_COOKIE_NAME
from ..session.actions import create_session, get_session_from_cookie, update_session
from ..services.aot_extractor import extract_metadata_from_file

router = APIRouter()

@router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    # Create temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".fits") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
        await file.close()
    
    # Extract metadata from the file to show the user a preview
    metadata = extract_metadata_from_file(tmp_path)
    session = await get_session_from_cookie(request)
    
    if session is not None:
        await update_session(session, tmp_path)
        return JSONResponse({"metadata": metadata})
    else:
        new_session_id = await create_session(tmp_path)
        if new_session_id is None:
            raise HTTPException(status_code=500, detail="Failed to create session")

        response = JSONResponse({"metadata": metadata})
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=str(new_session_id),
            httponly=True,
            secure=False,  # Set to True in production
            samesite="Lax"
        )
        
        return response
    