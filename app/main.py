import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.routes.youtube import router as youtube_router
from app.routes.reels import router as reels_router
from app.routes.bg_remover import router as bg_router
from app.routes.img_resizer import router as resizer_router
from app.routes.pdf_tools import router as pdf_router
from app.routes.invoice import router as invoice_router
from app.routes.cv_maker import router as cv_router
from app.routes.system import router as system_router, purge_expired_temp_files
from app.routes.stream_proxy import router as stream_proxy_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("orbit.main")

STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static"))
STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../storage/temp"))
os.makedirs(STORAGE_DIR, exist_ok=True)

async def hourly_cleanup_task():
    """Background task running every 3600 seconds (1 hour) to empty temp files."""
    while True:
        try:
            await asyncio.sleep(3600)
            logger.info("Running scheduled 1-hour storage cleanup cron job...")
            res = await purge_expired_temp_files(max_age_seconds=3600)
            logger.info(f"Cleanup finished: {res['message']}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in background storage cleanup task: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Launching ORBIT Web Application Engine...")
    cleanup_task = asyncio.create_task(hourly_cleanup_task())
    yield
    logger.info("Shutting down ORBIT...")
    cleanup_task.cancel()

app = FastAPI(
    title="ORBIT Dynamic Web Platform",
    description="Futuristic utility suite featuring YouTube extractor, AI BG remover, Smart Image Editor, PDF Editing, Invoice generator, and CV Maker.",
    version="2.5.0",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/css", StaticFiles(directory=os.path.join(STATIC_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(STATIC_DIR, "js")), name="js")

# Register API Routers
app.include_router(youtube_router)
app.include_router(reels_router)
app.include_router(bg_router)
app.include_router(resizer_router)
app.include_router(pdf_router)
app.include_router(invoice_router)
app.include_router(cv_router)
app.include_router(system_router)
app.include_router(stream_proxy_router)

@app.get("/")
async def serve_dashboard():
    index_path = os.path.join(STATIC_DIR, "index.html")
    return FileResponse(index_path)

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "app": "ORBIT Utility Engine",
        "version": "2.5.0",
        "environment": "active"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
