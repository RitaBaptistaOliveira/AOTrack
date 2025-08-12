import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .session.actions import delete_expired_sessions
from .routes import upload, pixel, command, measurements, session

@asynccontextmanager
async def lifespan(app: FastAPI):
    async def cleanup_loop():
        while True:
            await delete_expired_sessions()
            await asyncio.sleep(600)  # Run every 10 minutes

    task = asyncio.create_task(cleanup_loop())

    yield  # App is running here

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        print("Cleanup task cancelled.")
        pass

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(pixel.router)
app.include_router(measurements.router)
app.include_router(command.router)
app.include_router(session.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AOTrack Backend"}
