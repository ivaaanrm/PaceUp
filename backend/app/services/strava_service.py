"""Service for interacting with Strava API"""
import requests
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

from app.core.config import config

logger = logging.getLogger(__name__)


class StravaService:
    """Handles all interactions with Strava API"""
    
    def __init__(self):
        self.client_id = config.strava_client_id
        self.client_secret = config.strava_client_secret
        self.refresh_token = config.strava_refresh_token
        self.token_url = config.strava_token_url
        self.api_base_url = config.strava_api_base_url
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
    
    def _get_access_token(self) -> str:
        """
        Get a valid access token, refreshing if necessary.
        Returns the access token string.
        """
        # If we have a valid token, return it
        if self.access_token and self.token_expires_at and datetime.now() < self.token_expires_at:
            return self.access_token
        
        # Otherwise, refresh the token
        logger.info("Refreshing Strava access token")
        
        payload = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'grant_type': 'refresh_token',
            'refresh_token': self.refresh_token
        }
        
        response = requests.post(self.token_url, data=payload)
        response.raise_for_status()
        
        data = response.json()
        self.access_token = data['access_token']
        # Set expiration to 5 minutes before actual expiration for safety
        self.token_expires_at = datetime.now() + timedelta(seconds=data['expires_in'] - 300)
        
        logger.info(f"Access token refreshed, expires at {self.token_expires_at}")
        return self.access_token
    
    def _make_request(self, endpoint: str, method: str = "GET", params: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Make an authenticated request to the Strava API.
        
        Args:
            endpoint: The API endpoint (e.g., '/athlete/activities')
            method: HTTP method (GET, POST, etc.)
            params: Query parameters
            
        Returns:
            JSON response as a dictionary
        """
        access_token = self._get_access_token()
        
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        url = f"{self.api_base_url}{endpoint}"
        
        response = requests.request(method, url, headers=headers, params=params)
        response.raise_for_status()
        
        return response.json()
    
    def get_athlete(self) -> Dict[str, Any]:
        """
        Get the authenticated athlete's profile.
        
        Returns:
            Athlete data as a dictionary
        """
        logger.info("Fetching athlete profile")
        return self._make_request('/athlete')
    
    def get_athlete_stats(self, athlete_id: int) -> Dict[str, Any]:
        """
        Get statistics for an athlete.
        
        Args:
            athlete_id: The Strava athlete ID
            
        Returns:
            Athlete stats as a dictionary
        """
        logger.info(f"Fetching stats for athlete {athlete_id}")
        return self._make_request(f'/athletes/{athlete_id}/stats')
    
    def get_activities(
        self,
        before: Optional[int] = None,
        after: Optional[int] = None,
        page: int = 1,
        per_page: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get the authenticated athlete's activities.
        
        Args:
            before: Epoch timestamp to use for filtering activities before
            after: Epoch timestamp to use for filtering activities after
            page: Page number
            per_page: Number of items per page (max 200)
            
        Returns:
            List of activity dictionaries
        """
        params = {
            'page': page,
            'per_page': min(per_page, 200)  # Strava max is 200
        }
        
        if before:
            params['before'] = before
        if after:
            params['after'] = after
        
        logger.info(f"Fetching activities (page {page}, per_page {per_page})")
        return self._make_request('/athlete/activities', params=params)
    
    def get_activity_by_id(self, activity_id: int, include_all_efforts: bool = False) -> Dict[str, Any]:
        """
        Get detailed information about a specific activity.
        
        Args:
            activity_id: The Strava activity ID
            include_all_efforts: Include all segment efforts
            
        Returns:
            Detailed activity data as a dictionary
        """
        params = {}
        if include_all_efforts:
            params['include_all_efforts'] = 'true'
        
        logger.info(f"Fetching activity {activity_id}")
        return self._make_request(f'/activities/{activity_id}', params=params)
    
    def get_activity_laps(self, activity_id: int) -> List[Dict[str, Any]]:
        """
        Get laps for a specific activity.
        
        Args:
            activity_id: The Strava activity ID
            
        Returns:
            List of lap dictionaries
        """
        logger.info(f"Fetching laps for activity {activity_id}")
        return self._make_request(f'/activities/{activity_id}/laps')
    
    def get_all_activities(
        self,
        after: Optional[datetime] = None,
        before: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all activities for the authenticated athlete.
        Handles pagination automatically.
        
        Args:
            after: Get activities after this date
            before: Get activities before this date
            
        Returns:
            List of all activity dictionaries
        """
        all_activities = []
        page = 1
        per_page = 200  # Max allowed by Strava
        
        # Convert datetime to epoch if provided
        after_epoch = int(after.timestamp()) if after else None
        before_epoch = int(before.timestamp()) if before else None
        
        while True:
            activities = self.get_activities(
                before=before_epoch,
                after=after_epoch,
                page=page,
                per_page=per_page
            )
            
            if not activities:
                break
            
            all_activities.extend(activities)
            logger.info(f"Fetched page {page} with {len(activities)} activities")
            
            # If we got less than per_page, we've reached the end
            if len(activities) < per_page:
                break
            
            page += 1
        
        logger.info(f"Total activities fetched: {len(all_activities)}")
        return all_activities


# Singleton instance
strava_service = StravaService()

