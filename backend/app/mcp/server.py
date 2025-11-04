"""MCP Server for AI Training Analysis"""
import json
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.schema import Activity, Athlete, Lap, SessionLocal


class MCPServer:
    """
    Model Context Protocol Server for training analysis.
    Provides tools and resources for AI to analyze activities.
    """
    
    def __init__(self):
        self.tools = {
            "get_activities": self.get_activities,
            "get_activity_details": self.get_activity_details,
            "get_training_summary": self.get_training_summary,
            "get_performance_trends": self.get_performance_trends,
        }
    
    def get_activities(
        self, 
        athlete_id: int, 
        days: int = 30,
        sport_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get activities for an athlete from the last N days.
        
        Args:
            athlete_id: Athlete's Strava ID
            days: Number of days to look back (default 30)
            sport_type: Filter by sport type (e.g., 'Run', 'Ride')
        
        Returns:
            List of activities with key metrics
        """
        db: Session = SessionLocal()
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            query = db.query(Activity).filter(
                Activity.athlete_id == athlete_id,
                Activity.start_date >= cutoff_date
            )
            
            if sport_type:
                query = query.filter(Activity.sport_type == sport_type)
            
            activities = query.order_by(desc(Activity.start_date)).all()
            
            result = []
            for activity in activities:
                # Calculate pace (min/km)
                pace_min_per_km = None
                if activity.average_speed and activity.average_speed > 0:
                    pace_min_per_km = 1000 / (activity.average_speed * 60)
                
                result.append({
                    "id": activity.id,
                    "name": activity.name,
                    "date": activity.start_date.isoformat(),
                    "distance_km": round(activity.distance / 1000, 2),
                    "duration_minutes": round(activity.moving_time / 60, 1),
                    "pace_min_per_km": round(pace_min_per_km, 2) if pace_min_per_km else None,
                    "elevation_gain_m": round(activity.total_elevation_gain, 1),
                    "average_heartrate": round(activity.average_heartrate) if activity.average_heartrate else None,
                    "max_heartrate": round(activity.max_heartrate) if activity.max_heartrate else None,
                    "sport_type": activity.sport_type,
                })
            
            return result
        finally:
            db.close()
    
    def get_activity_details(
        self, 
        activity_id: int
    ) -> Dict[str, Any]:
        """
        Get detailed information about a specific activity including laps.
        
        Args:
            activity_id: Activity ID
        
        Returns:
            Activity details with lap information
        """
        db: Session = SessionLocal()
        try:
            activity = db.query(Activity).filter(Activity.id == activity_id).first()
            
            if not activity:
                return {"error": "Activity not found"}
            
            # Get laps
            laps = db.query(Lap).filter(
                Lap.activity_id == activity_id
            ).order_by(Lap.lap_index).all()
            
            lap_data = []
            for lap in laps:
                pace_min_per_km = None
                if lap.average_speed and lap.average_speed > 0:
                    pace_min_per_km = 1000 / (lap.average_speed * 60)
                
                lap_data.append({
                    "lap_number": lap.lap_index,
                    "distance_km": round(lap.distance / 1000, 2),
                    "duration_minutes": round(lap.moving_time / 60, 2),
                    "pace_min_per_km": round(pace_min_per_km, 2) if pace_min_per_km else None,
                    "average_heartrate": round(lap.average_heartrate) if lap.average_heartrate else None,
                })
            
            # Calculate overall pace
            pace_min_per_km = None
            if activity.average_speed and activity.average_speed > 0:
                pace_min_per_km = 1000 / (activity.average_speed * 60)
            
            return {
                "id": activity.id,
                "name": activity.name,
                "date": activity.start_date.isoformat(),
                "distance_km": round(activity.distance / 1000, 2),
                "duration_minutes": round(activity.moving_time / 60, 1),
                "pace_min_per_km": round(pace_min_per_km, 2) if pace_min_per_km else None,
                "elevation_gain_m": round(activity.total_elevation_gain, 1),
                "average_heartrate": round(activity.average_heartrate) if activity.average_heartrate else None,
                "max_heartrate": round(activity.max_heartrate) if activity.max_heartrate else None,
                "laps": lap_data,
            }
        finally:
            db.close()
    
    def get_training_summary(
        self, 
        athlete_id: int,
        weeks: int = 4
    ) -> Dict[str, Any]:
        """
        Get a summary of training load over the past N weeks.
        
        Args:
            athlete_id: Athlete's Strava ID
            weeks: Number of weeks to analyze (default 4)
        
        Returns:
            Weekly training statistics
        """
        db: Session = SessionLocal()
        try:
            # Get activities from the past N weeks
            cutoff_date = datetime.utcnow() - timedelta(weeks=weeks)
            
            activities = db.query(Activity).filter(
                Activity.athlete_id == athlete_id,
                Activity.start_date >= cutoff_date
            ).order_by(desc(Activity.start_date)).all()
            
            # Calculate weekly stats
            weekly_stats = []
            for week in range(weeks):
                week_start = datetime.utcnow() - timedelta(weeks=week+1)
                week_end = datetime.utcnow() - timedelta(weeks=week)
                
                week_activities = [
                    a for a in activities 
                    if week_start <= a.start_date < week_end
                ]
                
                total_distance = sum(a.distance for a in week_activities)
                total_time = sum(a.moving_time for a in week_activities)
                total_elevation = sum(a.total_elevation_gain for a in week_activities)
                
                # Calculate average pace for the week
                avg_pace = None
                if week_activities:
                    speeds = [a.average_speed for a in week_activities if a.average_speed]
                    if speeds:
                        avg_speed = sum(speeds) / len(speeds)
                        avg_pace = 1000 / (avg_speed * 60) if avg_speed > 0 else None
                
                weekly_stats.append({
                    "week_number": weeks - week,
                    "week_start": week_start.date().isoformat(),
                    "week_end": week_end.date().isoformat(),
                    "run_count": len(week_activities),
                    "total_distance_km": round(total_distance / 1000, 2),
                    "total_duration_hours": round(total_time / 3600, 1),
                    "total_elevation_m": round(total_elevation, 1),
                    "avg_pace_min_per_km": round(avg_pace, 2) if avg_pace else None,
                })
            
            # Calculate totals
            total_distance = sum(a.distance for a in activities)
            total_time = sum(a.moving_time for a in activities)
            total_elevation = sum(a.total_elevation_gain for a in activities)
            
            return {
                "period": f"Last {weeks} weeks",
                "total_runs": len(activities),
                "total_distance_km": round(total_distance / 1000, 2),
                "total_duration_hours": round(total_time / 3600, 1),
                "total_elevation_m": round(total_elevation, 1),
                "weekly_breakdown": weekly_stats,
            }
        finally:
            db.close()
    
    def get_performance_trends(
        self, 
        athlete_id: int,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Analyze performance trends over time.
        
        Args:
            athlete_id: Athlete's Strava ID
            days: Number of days to analyze (default 30)
        
        Returns:
            Performance trend analysis
        """
        db: Session = SessionLocal()
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            activities = db.query(Activity).filter(
                Activity.athlete_id == athlete_id,
                Activity.start_date >= cutoff_date
            ).order_by(Activity.start_date).all()
            
            if not activities:
                return {"error": "No activities found in the specified period"}
            
            # Split into first half and second half
            mid_point = len(activities) // 2
            first_half = activities[:mid_point] if mid_point > 0 else []
            second_half = activities[mid_point:]
            
            def calculate_avg_pace(acts):
                speeds = [a.average_speed for a in acts if a.average_speed and a.average_speed > 0]
                if not speeds:
                    return None
                avg_speed = sum(speeds) / len(speeds)
                return 1000 / (avg_speed * 60)
            
            first_half_pace = calculate_avg_pace(first_half)
            second_half_pace = calculate_avg_pace(second_half)
            
            pace_change = None
            if first_half_pace and second_half_pace:
                pace_change = second_half_pace - first_half_pace  # negative = faster
            
            # Analyze heartrate if available
            hr_data = [a.average_heartrate for a in activities if a.average_heartrate]
            avg_hr = sum(hr_data) / len(hr_data) if hr_data else None
            
            # Calculate recent vs older average distance
            recent_activities = activities[-7:] if len(activities) >= 7 else activities
            older_activities = activities[:-7] if len(activities) >= 7 else []
            
            recent_avg_distance = sum(a.distance for a in recent_activities) / len(recent_activities) if recent_activities else 0
            older_avg_distance = sum(a.distance for a in older_activities) / len(older_activities) if older_activities else 0
            
            return {
                "period_days": days,
                "total_runs": len(activities),
                "first_half_avg_pace_min_per_km": round(first_half_pace, 2) if first_half_pace else None,
                "second_half_avg_pace_min_per_km": round(second_half_pace, 2) if second_half_pace else None,
                "pace_change_min_per_km": round(pace_change, 2) if pace_change else None,
                "pace_trend": "improving" if pace_change and pace_change < 0 else "declining" if pace_change and pace_change > 0 else "stable",
                "average_heartrate": round(avg_hr) if avg_hr else None,
                "recent_avg_distance_km": round(recent_avg_distance / 1000, 2),
                "older_avg_distance_km": round(older_avg_distance / 1000, 2),
            }
        finally:
            db.close()
    
    def execute_tool(self, tool_name: str, **kwargs) -> Any:
        """
        Execute a tool by name with the provided arguments.
        
        Args:
            tool_name: Name of the tool to execute
            **kwargs: Arguments to pass to the tool
        
        Returns:
            Result from the tool execution
        """
        if tool_name not in self.tools:
            return {"error": f"Tool '{tool_name}' not found"}
        
        try:
            return self.tools[tool_name](**kwargs)
        except Exception as e:
            return {"error": str(e)}


# Singleton instance
mcp_server = MCPServer()

