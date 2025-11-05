"""Pydantic models for Training Plan API requests and responses"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class TrainingPlanRequest(BaseModel):
    """Request model for generating a training plan"""
    distance_objective: str  # e.g., "10km", "Half Marathon"
    pace_or_time_objective: str  # e.g., "4:30 min/km" or "Sub 40 minutes"
    personal_record: Optional[str] = None  # e.g., "39:42 in 10km"
    weekly_kms: Optional[float] = None  # Average weekly kilometers
    plan_duration_weeks: int  # Plan duration in weeks
    training_days: List[str]  # List of training days, e.g., ["Monday", "Wednesday", "Friday", "Sunday"]
    get_previous_activities_context: bool = False  # Whether to include historical context


class TrainingDay(BaseModel):
    """Model for a single training day"""
    day: str  # Day of the week
    activity_type: str  # e.g., "Easy Run", "Intervals", "Long Run", "Rest"
    details: str  # Detailed description of the activity


class TrainingWeek(BaseModel):
    """Model for a single training week"""
    week: int  # Week number
    days: List[TrainingDay]  # List of training days for this week


class TrainingPlanData(BaseModel):
    """Model for the structured training plan JSON"""
    training_plan: List[TrainingWeek]


class TrainingPlanResponse(BaseModel):
    """Response model for training plan data"""
    id: int
    request_id: int
    athlete_id: int
    insights: str  # Insights on the objective
    summary: str  # Summary of the plan objective
    training_plan_json: Dict[str, Any]  # The structured training plan in JSON format
    created_at: datetime
    
    class Config:
        from_attributes = True


class TrainingRequestResponse(BaseModel):
    """Response model for training request data"""
    id: int
    athlete_id: int
    distance_objective: str
    pace_or_time_objective: str
    personal_record: Optional[str]
    weekly_kms: Optional[float]
    plan_duration_weeks: int
    training_days: List[str]
    get_previous_activities_context: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class TrainingPlanGeneratedResponse(BaseModel):
    """Response after generating a new training plan"""
    message: str
    request: TrainingRequestResponse
    plan: TrainingPlanResponse


class ActivityCompletionRequest(BaseModel):
    """Request model for updating activity completion status"""
    week_number: int
    day: str
    activity_index: int
    is_completed: bool


class ActivityCompletionResponse(BaseModel):
    """Response model for activity completion status"""
    id: int
    plan_id: int
    week_number: int
    day: str
    activity_index: int
    is_completed: bool
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PlanProgressResponse(BaseModel):
    """Response model for training plan progress"""
    total_activities: int
    completed_activities: int
    progress_percentage: float

