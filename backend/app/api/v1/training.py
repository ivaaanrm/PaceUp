"""API endpoints for Training Plan generation"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from app.db.schema import SessionLocal, User
from app.services.strava_db_service import strava_db_service
from app.services.training_plan_service import training_plan_service
from app.models.training import (
    TrainingPlanRequest,
    TrainingPlanResponse,
    TrainingRequestResponse,
    TrainingPlanGeneratedResponse,
    ActivityCompletionRequest,
    ActivityCompletionResponse,
    PlanProgressResponse
)
from app.api.v1.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/training", tags=["Training Plans"])


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/generate", response_model=TrainingPlanGeneratedResponse)
async def generate_training_plan(
    request: TrainingPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a new AI-powered personalized training plan.
    This will create a training plan based on the user's objectives and current fitness level.
    Requires authentication.
    """
    try:
        # Get athlete from database
        athlete = strava_db_service.get_first_athlete(db)
        
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found. Please sync activities first.")
        
        # Convert request to dict for service
        request_data = request.model_dump()
        
        # Generate the training plan
        logger.info(f"Generating training plan for athlete {athlete.id}")
        plan = training_plan_service.generate_training_plan(
            db=db,
            athlete_id=athlete.id,
            request_data=request_data
        )
        
        # Get the associated request
        from app.db.schema import TrainingRequest
        training_request = db.query(TrainingRequest).filter(
            TrainingRequest.id == plan.request_id
        ).first()
        
        if not training_request:
            raise HTTPException(status_code=404, detail="Training request not found")
        
        return TrainingPlanGeneratedResponse(
            message="Training plan generated successfully",
            request=TrainingRequestResponse.model_validate(training_request),
            plan=TrainingPlanResponse.model_validate(plan)
        )
    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error generating training plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate training plan: {str(e)}")


@router.get("/latest", response_model=Optional[TrainingPlanResponse])
async def get_latest_plan(db: Session = Depends(get_db)):
    """
    Get the most recent training plan for the authenticated athlete.
    Returns null if no plan exists.
    """
    try:
        # Get athlete from database
        athlete = strava_db_service.get_first_athlete(db)
        
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found. Please sync activities first.")
        
        # Get the latest plan
        plan = training_plan_service.get_latest_plan(db, athlete.id)
        
        if not plan:
            return None
        
        return TrainingPlanResponse.model_validate(plan)
    except Exception as e:
        logger.error(f"Error getting latest plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get latest plan: {str(e)}")


@router.get("/plans", response_model=List[TrainingPlanResponse])
async def get_all_plans(
    db: Session = Depends(get_db),
    limit: int = Query(10, description="Maximum number of plans to return")
):
    """
    Get all training plans for the authenticated athlete.
    """
    try:
        # Get athlete from database
        athlete = strava_db_service.get_first_athlete(db)
        
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found. Please sync activities first.")
        
        # Get all plans
        plans = training_plan_service.get_all_plans(db, athlete.id, limit)
        
        return [TrainingPlanResponse.model_validate(p) for p in plans]
    except Exception as e:
        logger.error(f"Error getting plans: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get plans: {str(e)}")


@router.get("/plan/{plan_id}", response_model=TrainingPlanResponse)
async def get_plan(
    plan_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific training plan by ID.
    """
    try:
        from app.db.schema import TrainingPlan
        
        plan = db.query(TrainingPlan).filter(
            TrainingPlan.id == plan_id
        ).first()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Training plan not found")
        
        # Verify the plan belongs to the authenticated athlete
        athlete = strava_db_service.get_first_athlete(db)
        
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found. Please sync activities first.")
        
        if plan.athlete_id != athlete.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return TrainingPlanResponse.model_validate(plan)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get plan: {str(e)}")


@router.delete("/plan/{plan_id}")
async def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a training plan by ID.
    Requires authentication.
    """
    try:
        from app.db.schema import TrainingPlan
        
        plan = db.query(TrainingPlan).filter(
            TrainingPlan.id == plan_id
        ).first()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Training plan not found")
        
        # Verify the plan belongs to the authenticated athlete
        athlete = strava_db_service.get_first_athlete(db)
        
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found. Please sync activities first.")
        
        if plan.athlete_id != athlete.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete the plan (CASCADE will handle the request)
        db.delete(plan)
        db.commit()
        
        logger.info(f"Deleted training plan {plan_id} for athlete {athlete.id}")
        
        return {"message": "Training plan deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting plan: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete plan: {str(e)}")


@router.put("/plan/{plan_id}/activity", response_model=ActivityCompletionResponse)
async def update_activity_completion(
    plan_id: int,
    completion: ActivityCompletionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update the completion status of a specific activity in a training plan.
    Requires authentication.
    """
    try:
        from app.db.schema import TrainingPlan, TrainingPlanActivity
        
        # Verify the plan exists and belongs to the authenticated athlete
        plan = db.query(TrainingPlan).filter(TrainingPlan.id == plan_id).first()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Training plan not found")
        
        athlete = strava_db_service.get_first_athlete(db)
        
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found. Please sync activities first.")
        
        if plan.athlete_id != athlete.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get or create the completion record
        activity = db.query(TrainingPlanActivity).filter(
            TrainingPlanActivity.plan_id == plan_id,
            TrainingPlanActivity.week_number == completion.week_number,
            TrainingPlanActivity.day == completion.day,
            TrainingPlanActivity.activity_index == completion.activity_index
        ).first()
        
        if activity:
            # Update existing record
            activity.is_completed = completion.is_completed
            activity.completed_at = datetime.utcnow() if completion.is_completed else None
        else:
            # Create new record
            activity = TrainingPlanActivity(
                plan_id=plan_id,
                week_number=completion.week_number,
                day=completion.day,
                activity_index=completion.activity_index,
                is_completed=completion.is_completed,
                completed_at=datetime.utcnow() if completion.is_completed else None
            )
            db.add(activity)
        
        db.commit()
        db.refresh(activity)
        
        logger.info(f"Updated activity completion for plan {plan_id}, week {completion.week_number}, {completion.day}")
        
        return ActivityCompletionResponse.model_validate(activity)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating activity completion: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update activity completion: {str(e)}")


@router.get("/plan/{plan_id}/progress", response_model=PlanProgressResponse)
async def get_plan_progress(
    plan_id: int,
    db: Session = Depends(get_db)
):
    """
    Get the progress of a training plan.
    """
    try:
        from app.db.schema import TrainingPlan, TrainingPlanActivity
        
        plan = db.query(TrainingPlan).filter(TrainingPlan.id == plan_id).first()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Training plan not found")
        
        # Verify the plan belongs to the authenticated athlete
        athlete = strava_db_service.get_first_athlete(db)
        
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found. Please sync activities first.")
        
        if plan.athlete_id != athlete.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Count total activities from the plan JSON
        total_activities = 0
        for week in plan.training_plan_json.get('training_plan', []):
            total_activities += len(week.get('days', []))
        
        # Count completed activities
        completed_activities = db.query(TrainingPlanActivity).filter(
            TrainingPlanActivity.plan_id == plan_id,
            TrainingPlanActivity.is_completed == True
        ).count()
        
        progress_percentage = (completed_activities / total_activities * 100) if total_activities > 0 else 0.0
        
        return PlanProgressResponse(
            total_activities=total_activities,
            completed_activities=completed_activities,
            progress_percentage=round(progress_percentage, 2)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting plan progress: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get plan progress: {str(e)}")


@router.get("/plan/{plan_id}/completions", response_model=List[ActivityCompletionResponse])
async def get_plan_completions(
    plan_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all completion records for a training plan.
    """
    try:
        from app.db.schema import TrainingPlan, TrainingPlanActivity
        
        plan = db.query(TrainingPlan).filter(TrainingPlan.id == plan_id).first()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Training plan not found")
        
        # Verify the plan belongs to the authenticated athlete
        athlete = strava_db_service.get_first_athlete(db)
        
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found. Please sync activities first.")
        
        if plan.athlete_id != athlete.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        completions = db.query(TrainingPlanActivity).filter(
            TrainingPlanActivity.plan_id == plan_id
        ).all()
        
        return [ActivityCompletionResponse.model_validate(c) for c in completions]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting plan completions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get plan completions: {str(e)}")

