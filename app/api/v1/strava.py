"""API endpoints for Strava integration"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from app.db.schema import SessionLocal
from app.services.strava_service import strava_service
from app.services.strava_db_service import strava_db_service
from app.models.strava import (
    AthleteResponse,
    ActivityResponse,
    LapResponse,
    SyncResponse,
    AthleteStatsResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/strava", tags=["Strava"])


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/athlete", response_model=AthleteResponse)
async def get_athlete(db: Session = Depends(get_db)):
    """
    Get the authenticated athlete's profile from Strava and save it to the database.
    """
    try:
        # Fetch from Strava API
        athlete_data = strava_service.get_athlete()
        
        # Save to database
        athlete = strava_db_service.save_athlete(db, athlete_data)
        
        return AthleteResponse(
            id=athlete.id,
            username=athlete.username,
            firstname=athlete.firstname,
            lastname=athlete.lastname,
            city=athlete.city,
            state=athlete.state,
            country=athlete.country,
            sex=athlete.sex,
            weight=athlete.weight,
            profile=athlete.profile
        )
    except Exception as e:
        logger.error(f"Error fetching athlete: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch athlete: {str(e)}")


@router.get("/athlete/stats", response_model=AthleteStatsResponse)
async def get_athlete_stats():
    """
    Get the authenticated athlete's statistics from Strava.
    """
    try:
        # First get the athlete to get their ID
        athlete_data = strava_service.get_athlete()
        athlete_id = athlete_data.get('id')
        
        # Get stats
        stats = strava_service.get_athlete_stats(athlete_id)
        
        return AthleteStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error fetching athlete stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch athlete stats: {str(e)}")


@router.post("/sync/activities", response_model=SyncResponse)
async def sync_activities(
    db: Session = Depends(get_db),
    after: Optional[datetime] = Query(None, description="Sync activities after this date"),
    before: Optional[datetime] = Query(None, description="Sync activities before this date")
):
    """
    Sync activities from Strava to the database.
    This will fetch all activities and store them in the database.
    """
    try:
        # Get athlete first to ensure we have the athlete record
        athlete_data = strava_service.get_athlete()
        athlete = strava_db_service.save_athlete(db, athlete_data)
        
        # Fetch all activities
        activities = strava_service.get_all_activities(after=after, before=before)
        
        synced_count = 0
        for activity_data in activities:
            try:
                # Save activity
                strava_db_service.save_activity(db, activity_data, athlete.id)
                synced_count += 1
            except Exception as e:
                logger.error(f"Error saving activity {activity_data.get('id')}: {str(e)}")
        
        return SyncResponse(
            message=f"Successfully synced {synced_count} activities",
            synced_count=synced_count
        )
    except Exception as e:
        logger.error(f"Error syncing activities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sync activities: {str(e)}")


@router.post("/sync/activity/{activity_id}/laps", response_model=SyncResponse)
async def sync_activity_laps(
    activity_id: int,
    db: Session = Depends(get_db)
):
    """
    Sync laps for a specific activity from Strava.
    """
    try:
        # Fetch laps from Strava
        laps_data = strava_service.get_activity_laps(activity_id)
        
        # Save to database
        laps = strava_db_service.save_laps(db, activity_id, laps_data)
        
        return SyncResponse(
            message=f"Successfully synced {len(laps)} laps for activity {activity_id}",
            synced_count=len(laps)
        )
    except Exception as e:
        logger.error(f"Error syncing laps for activity {activity_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sync laps: {str(e)}")


@router.post("/sync/all", response_model=SyncResponse)
async def sync_all(
    db: Session = Depends(get_db),
    after: Optional[datetime] = Query(None, description="Sync activities after this date"),
    before: Optional[datetime] = Query(None, description="Sync activities before this date"),
    include_laps: bool = Query(False, description="Also sync laps for each activity")
):
    """
    Sync all data from Strava: athlete profile, activities, and optionally laps.
    """
    try:
        # Get athlete
        athlete_data = strava_service.get_athlete()
        athlete = strava_db_service.save_athlete(db, athlete_data)
        
        # Fetch all activities
        activities = strava_service.get_all_activities(after=after, before=before)
        
        activities_count = 0
        laps_count = 0
        
        for activity_data in activities:
            try:
                # Save activity
                strava_db_service.save_activity(db, activity_data, athlete.id)
                activities_count += 1
                
                # Optionally fetch and save laps
                if include_laps:
                    try:
                        laps_data = strava_service.get_activity_laps(activity_data['id'])
                        laps = strava_db_service.save_laps(db, activity_data['id'], laps_data)
                        laps_count += len(laps)
                    except Exception as e:
                        logger.warning(f"Could not fetch laps for activity {activity_data['id']}: {str(e)}")
            except Exception as e:
                logger.error(f"Error saving activity {activity_data.get('id')}: {str(e)}")
        
        message = f"Successfully synced {activities_count} activities"
        if include_laps:
            message += f" and {laps_count} laps"
        
        return SyncResponse(
            message=message,
            synced_count=activities_count
        )
    except Exception as e:
        logger.error(f"Error syncing all data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sync all data: {str(e)}")


@router.get("/activities", response_model=List[ActivityResponse])
async def get_activities(
    db: Session = Depends(get_db),
    limit: int = Query(100, description="Maximum number of activities to return")
):
    """
    Get activities from the database.
    """
    try:
        # Get athlete first
        athlete_data = strava_service.get_athlete()
        athlete_id = athlete_data.get('id')
        
        # Get activities from database
        activities = strava_db_service.get_activities(db, athlete_id, limit)
        
        return [
            ActivityResponse(
                id=activity.id,
                name=activity.name,
                distance=activity.distance,
                moving_time=activity.moving_time,
                elapsed_time=activity.elapsed_time,
                total_elevation_gain=activity.total_elevation_gain,
                sport_type=activity.sport_type,
                start_date=activity.start_date,
                average_speed=activity.average_speed,
                max_speed=activity.max_speed,
                average_heartrate=activity.average_heartrate,
                max_heartrate=activity.max_heartrate,
                average_cadence=activity.average_cadence
            )
            for activity in activities
        ]
    except Exception as e:
        logger.error(f"Error getting activities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get activities: {str(e)}")


@router.get("/activities/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    activity_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific activity from the database.
    """
    try:
        activity = strava_db_service.get_activity(db, activity_id)
        
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        return ActivityResponse(
            id=activity.id,
            name=activity.name,
            distance=activity.distance,
            moving_time=activity.moving_time,
            elapsed_time=activity.elapsed_time,
            total_elevation_gain=activity.total_elevation_gain,
            sport_type=activity.sport_type,
            start_date=activity.start_date,
            average_speed=activity.average_speed,
            max_speed=activity.max_speed,
            average_heartrate=activity.average_heartrate,
            max_heartrate=activity.max_heartrate,
            average_cadence=activity.average_cadence
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting activity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get activity: {str(e)}")


@router.get("/activities/{activity_id}/laps", response_model=List[LapResponse])
async def get_activity_laps(
    activity_id: int,
    db: Session = Depends(get_db)
):
    """
    Get laps for a specific activity from the database.
    """
    try:
        laps = strava_db_service.get_laps(db, activity_id)
        
        return [
            LapResponse(
                id=lap.id,
                activity_id=lap.activity_id,
                lap_index=lap.lap_index,
                distance=lap.distance,
                moving_time=lap.moving_time,
                elapsed_time=lap.elapsed_time,
                average_speed=lap.average_speed,
                max_speed=lap.max_speed,
                average_heartrate=lap.average_heartrate,
                max_heartrate=lap.max_heartrate
            )
            for lap in laps
        ]
    except Exception as e:
        logger.error(f"Error getting laps: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get laps: {str(e)}")

