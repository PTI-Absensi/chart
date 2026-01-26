"""
Trading Chart Application - Main Entry Point
FastAPI application with REST API and WebSocket support
"""
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import asyncio

from .config import settings
from .api.routes import router as api_router
from .api.websocket import router as ws_router, price_broadcaster
from .api.procurement_routes import router as procurement_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup: Start background price broadcaster
    task = asyncio.create_task(price_broadcaster())
    yield
    # Shutdown: Cancel the task
    task.cancel()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise Trading Chart Application with TradingView-style UI",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router)
app.include_router(ws_router)
app.include_router(procurement_router)

# Chart root directory (clean chart folder)
CHART_DIR = Path(__file__).parent.parent.parent

# Get procurement dashboard directory path (clean chart folder)
DASHBOARD_DIR = CHART_DIR

# Other dashboard pages (inside chart folder)
DFG_DASHBOARD = CHART_DIR / "dfg" / "index.html"
PROCESS_TIME_DASHBOARD = CHART_DIR / "process-time" / "index.html"

# Mount static files (CSS, JS) for chart frontend
if CHART_DIR.exists():
    app.mount("/css", StaticFiles(directory=CHART_DIR / "css"), name="css")
    app.mount("/js", StaticFiles(directory=CHART_DIR / "js"), name="js")

# Mount static files for procurement dashboard
if DASHBOARD_DIR.exists():
    app.mount("/dashboard/static", StaticFiles(directory=DASHBOARD_DIR), name="dashboard_static")


@app.get("/")
async def serve_frontend():
    """Serve the main frontend HTML"""
    index_path = DASHBOARD_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"message": "Frontend not found. Please check frontend directory."}


@app.get("/dashboard")
async def serve_dashboard():
    """Serve the procurement dashboard (existing dashboard with TradingView charts)"""
    index_path = DASHBOARD_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"message": "Dashboard not found. Please check dashboard directory."}


@app.get("/dashboard/dfg")
async def serve_dfg_dashboard():
    """Serve the DFG dashboard page"""
    if DFG_DASHBOARD.exists():
        return FileResponse(DFG_DASHBOARD)
    return {"message": "DFG dashboard not found. Please check dfg_module directory."}


@app.get("/dashboard/process-time")
async def serve_process_time_dashboard():
    """Serve the process time dashboard page"""
    if PROCESS_TIME_DASHBOARD.exists():
        return FileResponse(PROCESS_TIME_DASHBOARD)
    return {"message": "Process time dashboard not found. Please check process_time_module directory."}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )

