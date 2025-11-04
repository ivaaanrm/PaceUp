from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import strava, analysis
from app.core.config import config
from app.core.logging import setup_logging
from app.db.schema import Base, engine

setup_logging()
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=config.app_name,
    description="PaceUp - Track your running activities with Strava integration and AI-powered training insights",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register routes
app.include_router(strava.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to PaceUp API",
        "version": "0.1.0",
        "docs": "/docs"
    }
