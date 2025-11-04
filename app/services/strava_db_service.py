"""Service for storing and retrieving Strava data from the database"""
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from sqlalchemy.orm import Session

from app.db.schema import Athlete, Activity, Lap

logger = logging.getLogger(__name__)


class StravaDBService:
    """Handles database operations for Strava data"""
    
    @staticmethod
    def save_athlete(db: Session, athlete_data: Dict[str, Any]) -> Athlete:
        """
        Save or update athlete data in the database.
        
        Args:
            db: Database session
            athlete_data: Athlete data from Strava API
            
        Returns:
            Athlete object
        """
        athlete_id = athlete_data.get('id')
        
        # Check if athlete exists
        athlete = db.query(Athlete).filter(Athlete.id == athlete_id).first()
        
        if athlete:
            # Update existing athlete
            athlete.username = athlete_data.get('username')
            athlete.firstname = athlete_data.get('firstname')
            athlete.lastname = athlete_data.get('lastname')
            athlete.city = athlete_data.get('city')
            athlete.state = athlete_data.get('state')
            athlete.country = athlete_data.get('country')
            athlete.sex = athlete_data.get('sex')
            athlete.weight = athlete_data.get('weight')
            athlete.profile = athlete_data.get('profile')
            athlete.updated_at = datetime.utcnow()
            logger.info(f"Updated athlete {athlete_id}")
        else:
            # Create new athlete
            athlete = Athlete(
                id=athlete_id,
                username=athlete_data.get('username'),
                firstname=athlete_data.get('firstname'),
                lastname=athlete_data.get('lastname'),
                city=athlete_data.get('city'),
                state=athlete_data.get('state'),
                country=athlete_data.get('country'),
                sex=athlete_data.get('sex'),
                weight=athlete_data.get('weight'),
                profile=athlete_data.get('profile')
            )
            db.add(athlete)
            logger.info(f"Created new athlete {athlete_id}")
        
        db.commit()
        db.refresh(athlete)
        return athlete
    
    @staticmethod
    def save_activity(db: Session, activity_data: Dict[str, Any], athlete_id: int) -> Activity:
        """
        Save or update activity data in the database.
        
        Args:
            db: Database session
            activity_data: Activity data from Strava API
            athlete_id: The athlete ID
            
        Returns:
            Activity object
        """
        activity_id = activity_data.get('id')
        
        # Check if activity exists
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        
        # Parse dates
        start_date = activity_data.get('start_date')
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        start_date_local = activity_data.get('start_date_local')
        if isinstance(start_date_local, str):
            start_date_local = datetime.fromisoformat(start_date_local.replace('Z', '+00:00'))
        
        if activity:
            # Update existing activity
            activity.name = activity_data.get('name')
            activity.distance = activity_data.get('distance', 0)
            activity.moving_time = activity_data.get('moving_time', 0)
            activity.elapsed_time = activity_data.get('elapsed_time', 0)
            activity.total_elevation_gain = activity_data.get('total_elevation_gain', 0)
            activity.sport_type = activity_data.get('sport_type', activity_data.get('type', 'Unknown'))
            activity.start_date = start_date
            activity.start_date_local = start_date_local
            activity.timezone = activity_data.get('timezone')
            activity.average_speed = activity_data.get('average_speed')
            activity.max_speed = activity_data.get('max_speed')
            activity.average_heartrate = activity_data.get('average_heartrate')
            activity.max_heartrate = activity_data.get('max_heartrate')
            activity.average_cadence = activity_data.get('average_cadence')
            activity.start_latitude = activity_data.get('start_latlng', [None, None])[0] if activity_data.get('start_latlng') else None
            activity.start_longitude = activity_data.get('start_latlng', [None, None])[1] if activity_data.get('start_latlng') else None
            activity.end_latitude = activity_data.get('end_latlng', [None, None])[0] if activity_data.get('end_latlng') else None
            activity.end_longitude = activity_data.get('end_latlng', [None, None])[1] if activity_data.get('end_latlng') else None
            activity.achievement_count = activity_data.get('achievement_count')
            activity.kudos_count = activity_data.get('kudos_count')
            activity.comment_count = activity_data.get('comment_count')
            activity.athlete_count = activity_data.get('athlete_count')
            activity.raw_data = activity_data
            activity.updated_at = datetime.utcnow()
            logger.info(f"Updated activity {activity_id}")
        else:
            # Create new activity
            activity = Activity(
                id=activity_id,
                athlete_id=athlete_id,
                name=activity_data.get('name'),
                distance=activity_data.get('distance', 0),
                moving_time=activity_data.get('moving_time', 0),
                elapsed_time=activity_data.get('elapsed_time', 0),
                total_elevation_gain=activity_data.get('total_elevation_gain', 0),
                sport_type=activity_data.get('sport_type', activity_data.get('type', 'Unknown')),
                start_date=start_date,
                start_date_local=start_date_local,
                timezone=activity_data.get('timezone'),
                average_speed=activity_data.get('average_speed'),
                max_speed=activity_data.get('max_speed'),
                average_heartrate=activity_data.get('average_heartrate'),
                max_heartrate=activity_data.get('max_heartrate'),
                average_cadence=activity_data.get('average_cadence'),
                start_latitude=activity_data.get('start_latlng', [None, None])[0] if activity_data.get('start_latlng') else None,
                start_longitude=activity_data.get('start_latlng', [None, None])[1] if activity_data.get('start_latlng') else None,
                end_latitude=activity_data.get('end_latlng', [None, None])[0] if activity_data.get('end_latlng') else None,
                end_longitude=activity_data.get('end_latlng', [None, None])[1] if activity_data.get('end_latlng') else None,
                achievement_count=activity_data.get('achievement_count'),
                kudos_count=activity_data.get('kudos_count'),
                comment_count=activity_data.get('comment_count'),
                athlete_count=activity_data.get('athlete_count'),
                raw_data=activity_data
            )
            db.add(activity)
            logger.info(f"Created new activity {activity_id}")
        
        db.commit()
        db.refresh(activity)
        return activity
    
    @staticmethod
    def save_laps(db: Session, activity_id: int, laps_data: List[Dict[str, Any]]) -> List[Lap]:
        """
        Save laps for an activity. Deletes existing laps and creates new ones.
        
        Args:
            db: Database session
            activity_id: The activity ID
            laps_data: List of lap data from Strava API
            
        Returns:
            List of Lap objects
        """
        # Delete existing laps for this activity
        db.query(Lap).filter(Lap.activity_id == activity_id).delete()
        
        laps = []
        for index, lap_data in enumerate(laps_data):
            # Parse start date
            start_date = lap_data.get('start_date')
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            
            lap = Lap(
                activity_id=activity_id,
                lap_index=index,
                name=lap_data.get('name'),
                distance=lap_data.get('distance', 0),
                moving_time=lap_data.get('moving_time', 0),
                elapsed_time=lap_data.get('elapsed_time', 0),
                total_elevation_gain=lap_data.get('total_elevation_gain'),
                average_speed=lap_data.get('average_speed'),
                max_speed=lap_data.get('max_speed'),
                average_heartrate=lap_data.get('average_heartrate'),
                max_heartrate=lap_data.get('max_heartrate'),
                average_cadence=lap_data.get('average_cadence'),
                pace_zone=lap_data.get('pace_zone'),
                start_date=start_date,
                raw_data=lap_data
            )
            db.add(lap)
            laps.append(lap)
        
        db.commit()
        logger.info(f"Saved {len(laps)} laps for activity {activity_id}")
        return laps
    
    @staticmethod
    def get_athlete(db: Session, athlete_id: int) -> Optional[Athlete]:
        """Get athlete by ID"""
        return db.query(Athlete).filter(Athlete.id == athlete_id).first()
    
    @staticmethod
    def get_activities(db: Session, athlete_id: int, limit: int = 100) -> List[Activity]:
        """Get activities for an athlete"""
        return db.query(Activity).filter(
            Activity.athlete_id == athlete_id
        ).order_by(Activity.start_date.desc()).limit(limit).all()
    
    @staticmethod
    def get_activity(db: Session, activity_id: int) -> Optional[Activity]:
        """Get activity by ID"""
        return db.query(Activity).filter(Activity.id == activity_id).first()
    
    @staticmethod
    def get_laps(db: Session, activity_id: int) -> List[Lap]:
        """Get laps for an activity"""
        return db.query(Lap).filter(
            Lap.activity_id == activity_id
        ).order_by(Lap.lap_index).all()


strava_db_service = StravaDBService()

