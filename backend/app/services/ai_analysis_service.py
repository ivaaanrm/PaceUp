"""Service for AI-powered training analysis using OpenAI"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from openai import OpenAI

from app.core.config import config
from app.db.schema import TrainingAnalysis, Activity, Athlete
from app.mcp.server import mcp_server

logger = logging.getLogger(__name__)


class AIAnalysisService:
    """Service for generating AI-powered training insights"""
    
    def __init__(self):
        self.client = OpenAI(api_key=config.openai_api_key)
        self.model = config.openai_model
    
    def generate_training_analysis(
        self, 
        db: Session, 
        athlete_id: int,
        days: int = 30
    ) -> TrainingAnalysis:
        """
        Generate a comprehensive training analysis using AI.
        
        Args:
            db: Database session
            athlete_id: Athlete's ID
            days: Number of days to analyze (default 30)
        
        Returns:
            TrainingAnalysis object with insights
        """
        try:
            # Get athlete info
            athlete = db.query(Athlete).filter(Athlete.id == athlete_id).first()
            if not athlete:
                raise ValueError(f"Athlete {athlete_id} not found")
            
            # Use MCP server to gather training data
            activities_data = mcp_server.get_activities(athlete_id, days=days)
            training_summary = mcp_server.get_training_summary(athlete_id, weeks=4)
            performance_trends = mcp_server.get_performance_trends(athlete_id, days=days)
            
            if not activities_data:
                raise ValueError("No activities found for analysis")
            
            # Prepare the context for the AI
            context = self._prepare_analysis_context(
                athlete=athlete,
                activities=activities_data,
                training_summary=training_summary,
                performance_trends=performance_trends
            )
            
            # Call OpenAI API
            logger.info(f"Generating AI analysis for athlete {athlete_id}")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert running coach and sports scientist. 
                        Analyze the provided training data and provide actionable insights.
                        Focus on:
                        1. Training load and volume trends
                        2. Recovery and fatigue indicators
                        3. Performance progression
                        4. Specific recommendations for upcoming runs
                        
                        Be concise, supportive, and specific in your recommendations."""
                    },
                    {
                        "role": "user",
                        "content": f"""Analyze this runner's training data and provide insights:

{context}

Please provide:
1. A brief summary (2-3 sentences) of their current training status
2. Detailed training load insight analyzing their volume, intensity, and progression
3. Specific, actionable tips for their next runs (3-5 recommendations)

Format your response as JSON with the following structure:
{{
    "summary": "brief summary here",
    "training_load_insight": "detailed analysis here",
    "tips": "tip 1\\ntip 2\\ntip 3..."
}}"""
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=1000
            )
            
            # Parse the AI response
            ai_response = json.loads(response.choices[0].message.content)
            
            # Calculate analysis period
            analysis_end = datetime.utcnow()
            analysis_start = analysis_end - timedelta(days=days)
            
            # Create and save the analysis
            analysis = TrainingAnalysis(
                athlete_id=athlete_id,
                summary=ai_response.get("summary", "Analysis completed"),
                training_load_insight=ai_response.get("training_load_insight", ""),
                tips=ai_response.get("tips", ""),
                activities_analyzed_count=len(activities_data),
                analysis_period_start=analysis_start,
                analysis_period_end=analysis_end,
                raw_response={
                    "openai_response": ai_response,
                    "training_data": {
                        "activities_count": len(activities_data),
                        "training_summary": training_summary,
                        "performance_trends": performance_trends
                    }
                }
            )
            
            db.add(analysis)
            db.commit()
            db.refresh(analysis)
            
            logger.info(f"Successfully generated analysis {analysis.id} for athlete {athlete_id}")
            return analysis
            
        except Exception as e:
            logger.error(f"Error generating AI analysis: {str(e)}")
            db.rollback()
            raise
    
    def _prepare_analysis_context(
        self,
        athlete: Athlete,
        activities: list,
        training_summary: Dict[str, Any],
        performance_trends: Dict[str, Any]
    ) -> str:
        """
        Prepare a formatted context string for the AI analysis.
        
        Args:
            athlete: Athlete object
            activities: List of recent activities
            training_summary: Weekly training summary
            performance_trends: Performance trend analysis
        
        Returns:
            Formatted context string
        """
        context = f"""
ATHLETE PROFILE:
Name: {athlete.firstname or 'Unknown'} {athlete.lastname or ''}
Weight: {athlete.weight if athlete.weight else 'Not specified'} kg
Location: {athlete.city or 'Unknown'}, {athlete.country or 'Unknown'}

TRAINING SUMMARY ({training_summary.get('period', 'Last 4 weeks')}):
- Total Runs: {training_summary.get('total_runs', 0)}
- Total Distance: {training_summary.get('total_distance_km', 0)} km
- Total Time: {training_summary.get('total_duration_hours', 0)} hours
- Total Elevation: {training_summary.get('total_elevation_m', 0)} m

WEEKLY BREAKDOWN:
"""
        for week in training_summary.get('weekly_breakdown', []):
            context += f"""
Week {week['week_number']} ({week['week_start']} to {week['week_end']}):
  - Runs: {week['run_count']}
  - Distance: {week['total_distance_km']} km
  - Duration: {week['total_duration_hours']} hours
  - Avg Pace: {week['avg_pace_min_per_km'] if week['avg_pace_min_per_km'] else 'N/A'} min/km
"""
        
        context += f"""

PERFORMANCE TRENDS:
- Total runs analyzed: {performance_trends.get('total_runs', 0)}
- Pace trend: {performance_trends.get('pace_trend', 'N/A')}
- First half avg pace: {performance_trends.get('first_half_avg_pace_min_per_km', 'N/A')} min/km
- Second half avg pace: {performance_trends.get('second_half_avg_pace_min_per_km', 'N/A')} min/km
- Pace change: {performance_trends.get('pace_change_min_per_km', 'N/A')} min/km
- Average heart rate: {performance_trends.get('average_heartrate', 'N/A')} bpm
- Recent avg distance: {performance_trends.get('recent_avg_distance_km', 0)} km
- Older avg distance: {performance_trends.get('older_avg_distance_km', 0)} km

RECENT ACTIVITIES (Last {len(activities[:10])} runs):
"""
        for activity in activities[:10]:
            context += f"""
- {activity['date']}: {activity['name']}
  Distance: {activity['distance_km']} km, Duration: {activity['duration_minutes']} min
  Pace: {activity['pace_min_per_km'] if activity['pace_min_per_km'] else 'N/A'} min/km
  Elevation: {activity['elevation_gain_m']} m
  HR: {activity['average_heartrate'] if activity['average_heartrate'] else 'N/A'} bpm (avg)
"""
        
        return context
    
    def get_latest_analysis(
        self,
        db: Session,
        athlete_id: int
    ) -> Optional[TrainingAnalysis]:
        """
        Get the most recent training analysis for an athlete.
        
        Args:
            db: Database session
            athlete_id: Athlete's ID
        
        Returns:
            Latest TrainingAnalysis or None
        """
        return db.query(TrainingAnalysis).filter(
            TrainingAnalysis.athlete_id == athlete_id
        ).order_by(desc(TrainingAnalysis.created_at)).first()
    
    def get_all_analyses(
        self,
        db: Session,
        athlete_id: int,
        limit: int = 10
    ) -> list[TrainingAnalysis]:
        """
        Get all training analyses for an athlete.
        
        Args:
            db: Database session
            athlete_id: Athlete's ID
            limit: Maximum number of analyses to return
        
        Returns:
            List of TrainingAnalysis objects
        """
        return db.query(TrainingAnalysis).filter(
            TrainingAnalysis.athlete_id == athlete_id
        ).order_by(desc(TrainingAnalysis.created_at)).limit(limit).all()


# Singleton instance
ai_analysis_service = AIAnalysisService()

