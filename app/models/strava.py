"""Pydantic models for Strava API responses"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AthleteResponse(BaseModel):
    """Response model for athlete data"""
    id: int
    username: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    sex: Optional[str] = None
    weight: Optional[float] = None
    profile: Optional[str] = None
    
    class Config:
        from_attributes = True


class ActivityResponse(BaseModel):
    """Response model for activity data"""
    id: int
    name: str
    distance: float
    moving_time: int
    elapsed_time: int
    total_elevation_gain: float
    sport_type: str
    start_date: datetime
    average_speed: Optional[float] = None
    max_speed: Optional[float] = None
    average_heartrate: Optional[float] = None
    max_heartrate: Optional[float] = None
    average_cadence: Optional[float] = None
    
    class Config:
        from_attributes = True


class LapResponse(BaseModel):
    """Response model for lap data"""
    id: int
    activity_id: int
    lap_index: int
    distance: float
    moving_time: int
    elapsed_time: int
    average_speed: Optional[float] = None
    max_speed: Optional[float] = None
    average_heartrate: Optional[float] = None
    max_heartrate: Optional[float] = None
    
    class Config:
        from_attributes = True


class SyncResponse(BaseModel):
    """Response model for sync operations"""
    message: str
    synced_count: int


class AthleteStatsResponse(BaseModel):
    """Response model for athlete stats"""
    # This is a flexible model that accepts any fields from Strava
    # You can customize this based on what stats you want to display
    
    class Config:
        extra = "allow"  # Allow extra fields from Strava API

