"""API endpoints for AI Training Analysis"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.db.schema import SessionLocal
from app.services.strava_service import strava_service
from app.services.ai_analysis_service import ai_analysis_service
from app.models.analysis import (
    TrainingAnalysisResponse,
    AnalysisRequest,
    AnalysisGeneratedResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["Training Analysis"])


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/generate", response_model=AnalysisGeneratedResponse)
async def generate_analysis(
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a new AI-powered training analysis.
    This will analyze recent activities and provide insights and tips.
    """
    try:
        # Get the authenticated athlete
        athlete_data = strava_service.get_athlete()
        athlete_id = athlete_data.get('id')
        
        # Generate the analysis
        logger.info(f"Generating analysis for athlete {athlete_id} (last {request.days} days)")
        analysis = ai_analysis_service.generate_training_analysis(
            db=db,
            athlete_id=athlete_id,
            days=request.days
        )
        
        return AnalysisGeneratedResponse(
            message="Analysis generated successfully",
            analysis=TrainingAnalysisResponse.model_validate(analysis)
        )
    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error generating analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate analysis: {str(e)}")


@router.get("/latest", response_model=Optional[TrainingAnalysisResponse])
async def get_latest_analysis(db: Session = Depends(get_db)):
    """
    Get the most recent training analysis for the authenticated athlete.
    Returns null if no analysis exists.
    """
    try:
        # Get the authenticated athlete
        athlete_data = strava_service.get_athlete()
        athlete_id = athlete_data.get('id')
        
        # Get the latest analysis
        analysis = ai_analysis_service.get_latest_analysis(db, athlete_id)
        
        if not analysis:
            return None
        
        return TrainingAnalysisResponse.model_validate(analysis)
    except Exception as e:
        logger.error(f"Error getting latest analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get latest analysis: {str(e)}")


@router.get("/history", response_model=List[TrainingAnalysisResponse])
async def get_analysis_history(
    db: Session = Depends(get_db),
    limit: int = Query(10, description="Maximum number of analyses to return")
):
    """
    Get the history of training analyses for the authenticated athlete.
    """
    try:
        # Get the authenticated athlete
        athlete_data = strava_service.get_athlete()
        athlete_id = athlete_data.get('id')
        
        # Get all analyses
        analyses = ai_analysis_service.get_all_analyses(db, athlete_id, limit)
        
        return [TrainingAnalysisResponse.model_validate(a) for a in analyses]
    except Exception as e:
        logger.error(f"Error getting analysis history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get analysis history: {str(e)}")


@router.get("/{analysis_id}", response_model=TrainingAnalysisResponse)
async def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific training analysis by ID.
    """
    try:
        from app.db.schema import TrainingAnalysis
        
        analysis = db.query(TrainingAnalysis).filter(
            TrainingAnalysis.id == analysis_id
        ).first()
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Verify the analysis belongs to the authenticated athlete
        athlete_data = strava_service.get_athlete()
        athlete_id = athlete_data.get('id')
        
        if analysis.athlete_id != athlete_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return TrainingAnalysisResponse.model_validate(analysis)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get analysis: {str(e)}")

