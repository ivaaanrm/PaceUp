"""Pydantic models for Training Analysis API responses"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TrainingAnalysisResponse(BaseModel):
    """Response model for training analysis data"""
    id: int
    athlete_id: int
    summary: str
    training_load_insight: str
    tips: str
    activities_analyzed_count: int
    analysis_period_start: datetime
    analysis_period_end: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class AnalysisRequest(BaseModel):
    """Request model for generating a new analysis"""
    days: int = 30  # Number of days to analyze (default 30)


class AnalysisGeneratedResponse(BaseModel):
    """Response after generating a new analysis"""
    message: str
    analysis: TrainingAnalysisResponse

