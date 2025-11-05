"""API endpoints for Strava integration"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import logging

from app.db.schema import SessionLocal, User
from app.services.strava_service import strava_service, StravaRateLimitError
from app.services.strava_db_service import strava_db_service
from app.models.strava import (
    AthleteResponse,
    ActivityResponse,
    LapResponse,
    SyncResponse,
    AthleteStatsResponse
)
from app.api.v1.auth import get_current_user

logger = logging.getLogger(__name__)

# Default sync date: September 1, 2025
DEFAULT_SYNC_AFTER_DATE = datetime(2025, 9, 1, 0, 0, 0, tzinfo=timezone.utc)

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
    Get the authenticated athlete's profile from the database.
    Only fetches from Strava API if not found in database.
    """
    try:
        # Try to get athlete from database first
        athlete = strava_db_service.get_first_athlete(db)
        
        if not athlete:
            # If not in database, fetch from Strava API
            logger.info("Athlete not found in database, fetching from Strava API")
            athlete_data = strava_service.get_athlete()
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
async def get_athlete_stats(db: Session = Depends(get_db)):
    """
    Get the authenticated athlete's statistics from the database.
    Only fetches from Strava API if not found in database.
    """
    try:
        # Get athlete from database
        athlete = strava_db_service.get_first_athlete(db)
        
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found. Please sync activities first.")
        
        # If stats exist in database, return them
        if athlete.stats:
            return AthleteStatsResponse(**athlete.stats)
        
        # If no stats in database, return empty or error
        raise HTTPException(
            status_code=404, 
            detail="Athlete stats not found. Please sync activities to fetch stats."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching athlete stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch athlete stats: {str(e)}")


@router.post("/sync/activities", response_model=SyncResponse)
async def sync_activities(
    db: Session = Depends(get_db),
    after: Optional[datetime] = Query(None, description="Sync activities after this date (defaults to September 1, 2025)"),
    before: Optional[datetime] = Query(None, description="Sync activities before this date"),
    current_user: User = Depends(get_current_user)
):
    """
    Sync activities from Strava to the database.
    This will fetch athlete profile, stats, and all activities from Strava API and store them in the database.
    By default, only syncs activities after September 1, 2025.
    Requires authentication.
    """
    try:
        # Get athlete from Strava API and save to database
        athlete_data = strava_service.get_athlete()
        athlete = strava_db_service.save_athlete(db, athlete_data)
        
        # Fetch and save athlete stats
        try:
            stats = strava_service.get_athlete_stats(athlete.id)
            strava_db_service.save_athlete_stats(db, athlete.id, stats)
            logger.info(f"Updated athlete stats for athlete {athlete.id}")
        except Exception as e:
            logger.warning(f"Could not fetch athlete stats: {str(e)}")
        
        # Use default date if not provided
        sync_after = after if after is not None else DEFAULT_SYNC_AFTER_DATE
        logger.info(f"Syncing activities after {sync_after}")
        
        # Fetch all activities
        activities = strava_service.get_all_activities(after=sync_after, before=before)
        
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
    except StravaRateLimitError as e:
        logger.error(f"Strava rate limit exceeded: {str(e)}")
        raise HTTPException(
            status_code=429,
            detail="Strava API rate limit exceeded. Please wait 15 minutes before trying again."
        )
    except Exception as e:
        logger.error(f"Error syncing activities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sync activities: {str(e)}")


@router.post("/sync/activity/{activity_id}/laps", response_model=SyncResponse)
async def sync_activity_laps(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sync laps for a specific activity from Strava.
    Requires authentication.
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
    except StravaRateLimitError as e:
        logger.error(f"Strava rate limit exceeded: {str(e)}")
        raise HTTPException(
            status_code=429,
            detail="Strava API rate limit exceeded. Please wait 15 minutes before trying again."
        )
    except Exception as e:
        logger.error(f"Error syncing laps for activity {activity_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sync laps: {str(e)}")


@router.post("/sync/all", response_model=SyncResponse)
async def sync_all(
    db: Session = Depends(get_db),
    after: Optional[datetime] = Query(None, description="Sync activities after this date (defaults to September 1, 2025)"),
    before: Optional[datetime] = Query(None, description="Sync activities before this date"),
    include_laps: bool = Query(False, description="Also sync laps for each activity"),
    current_user: User = Depends(get_current_user)
):
    """
    Sync all data from Strava: athlete profile, stats, activities, and optionally laps.
    By default, only syncs activities after September 1, 2025.
    Requires authentication.
    """
    try:
        # Get athlete from Strava API and save to database
        athlete_data = strava_service.get_athlete()
        athlete = strava_db_service.save_athlete(db, athlete_data)
        
        # Fetch and save athlete stats
        try:
            stats = strava_service.get_athlete_stats(athlete.id)
            strava_db_service.save_athlete_stats(db, athlete.id, stats)
            logger.info(f"Updated athlete stats for athlete {athlete.id}")
        except Exception as e:
            logger.warning(f"Could not fetch athlete stats: {str(e)}")
        
        # Use default date if not provided
        sync_after = after if after is not None else DEFAULT_SYNC_AFTER_DATE
        logger.info(f"Syncing activities after {sync_after}")
        
        # Fetch all activities
        activities = strava_service.get_all_activities(after=sync_after, before=before)
        
        activities_count = 0
        new_activities_count = 0
        laps_count = 0
        
        for activity_data in activities:
            try:
                activity_id = activity_data.get('id')
                
                # Check if activity already exists before saving
                existing_activity = strava_db_service.get_activity(db, activity_id)
                is_new_activity = existing_activity is None
                
                # Save activity
                strava_db_service.save_activity(db, activity_data, athlete.id)
                activities_count += 1
                
                if is_new_activity:
                    new_activities_count += 1
                
                # Optionally fetch and save laps
                # Only fetch laps for new activities or activities without laps
                if include_laps:
                    # Check if activity already has laps
                    has_existing_laps = strava_db_service.has_laps(db, activity_id)
                    
                    if is_new_activity or not has_existing_laps:
                        try:
                            laps_data = strava_service.get_activity_laps(activity_id)
                            laps = strava_db_service.save_laps(db, activity_id, laps_data)
                            laps_count += len(laps)
                            logger.info(f"Fetched {len(laps)} laps for activity {activity_id}")
                        except StravaRateLimitError:
                            # Re-raise rate limit errors to be handled at the top level
                            raise
                        except Exception as e:
                            logger.warning(f"Could not fetch laps for activity {activity_id}: {str(e)}")
                    else:
                        logger.info(f"Skipping lap fetch for activity {activity_id} (already has laps)")
            except StravaRateLimitError:
                # Re-raise rate limit errors to be handled at the top level
                raise
            except Exception as e:
                logger.error(f"Error saving activity {activity_data.get('id')}: {str(e)}")
        
        message = f"Successfully synced {activities_count} activities"
        if new_activities_count > 0:
            message += f" ({new_activities_count} new)"
        if include_laps:
            message += f" and {laps_count} laps"
        
        return SyncResponse(
            message=message,
            synced_count=activities_count
        )
    except StravaRateLimitError as e:
        logger.error(f"Strava rate limit exceeded: {str(e)}")
        raise HTTPException(
            status_code=429,
            detail="Strava API rate limit exceeded. Please wait 15 minutes before trying again."
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
        # Get athlete from database
        athlete = strava_db_service.get_first_athlete(db)
        
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found. Please sync activities first.")
        
        # Get activities from database
        activities = strava_db_service.get_activities(db, athlete.id, limit)
        
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


@router.get("/laps/all")
async def get_all_laps(
    db: Session = Depends(get_db),
    limit: int = Query(1000, description="Maximum number of laps to return")
):
    """
    Get all laps from all activities with activity date information.
    Returns laps sorted by activity date.
    """
    try:
        # Get athlete from database
        athlete = strava_db_service.get_first_athlete(db)
        
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found. Please sync activities first.")
        
        # Get all laps with activity information
        laps = strava_db_service.get_all_laps_with_activity_info(db, athlete.id, limit)
        
        return laps
    except Exception as e:
        logger.error(f"Error getting all laps: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get all laps: {str(e)}")

