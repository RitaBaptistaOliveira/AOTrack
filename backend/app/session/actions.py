import os
from typing import Optional
from uuid import UUID, uuid4
from fastapi import Request

from .manager import SessionData, session_store, SESSION_COOKIE_NAME

# Function to get an existing session
async def get_session_from_id(session_id: UUID) -> Optional[SessionData]:
    return session_store.get(session_id)

# Function to get session from cookie
async def get_session_from_cookie(request: Request) -> Optional[SessionData]:
    session_id_str = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id_str:
        return None
    try:
        session_id = UUID(session_id_str)
        return await get_session_from_id(session_id)
    except ValueError:
        return None

# Function to create a new session
async def create_session(file_path: str) -> UUID:
    session_id = uuid4()
    session_data = SessionData(file_path=file_path)
    
    session_store[session_id] = session_data
    
    return session_id


# Function to delete expired sessions, runs periodically
async def delete_expired_sessions():
    to_delete = []
    
    for session_id, session in session_store.items():
        if session.is_expired():
            to_delete.append(session_id)
            try:
                os.unlink(session.file_path)
            except Exception:
                print(f"Failed to delete file for session {session_id}")
                pass

    for session_id in to_delete:
        pop_session(session_id)

# Function to clean a single session by ID
async def delete_single_session(session_id: UUID) -> bool:
    session = await get_session_from_id(session_id)
    if session is None:
        print(f"Session {session_id} does not exist or has already been cleaned.")
        return False

    try:
        os.unlink(session.file_path)
    except Exception:
        print(f"Failed to delete file {session.file_path} for session {session_id}")
        pass

    pop_session(session_id)
    return True

async def update_session(session: SessionData, file_path: Optional[str] = None) -> None:
    session.update_timestamp()
    if file_path:
        os.unlink(session.file_path)
        session.update_file_path(file_path)
        print(f"Session updated with new file path: {file_path}")
    else:
        print(f"Session only updated the timestamp.")

def pop_session(session_id):
    session = session_store.pop(session_id, None)
    if session is not None:
        print(f"Session {session_id} has been deleted due to expiration.")
    else:
        print(f"Session {session_id} does not exist or has already been cleaned.")