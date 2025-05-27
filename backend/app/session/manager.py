from datetime import datetime
import datetime as dt
from uuid import UUID

SESSION_COOKIE_NAME = "ao_session"

# Session management for AOTrack using FastAPI Sessions
class SessionData:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.created_at = datetime.now(dt.UTC)
        
    def is_expired(self, timeout: int = 3600) -> bool:
        """
        Check if the session is expired based on the timeout in seconds.
        """
        return (datetime.now(dt.UTC) - self.created_at).total_seconds() > timeout
    
    def update_timestamp(self):
        """
        Update the session timestamp to the current time.
        """
        self.created_at = datetime.now(dt.UTC)
        
    def update_file_path(self, new_file_path: str):
        """
        Update the file path associated with the session.
        """
        self.file_path = new_file_path

# In-memory session store
session_store: dict[UUID, SessionData] = {}
