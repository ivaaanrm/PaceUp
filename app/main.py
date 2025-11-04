from fastapi import FastAPI

from app.api.v1 import strava
from app.core.config import config
from app.core.logging import setup_logging
from app.db.schema import Base, engine

setup_logging()
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=config.app_name,
    description="PaceUp - Track your running activities with Strava integration",
    version="0.1.0"
)


# Register routes
app.include_router(strava.router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to PaceUp API",
        "version": "0.1.0",
        "docs": "/docs"
    }
