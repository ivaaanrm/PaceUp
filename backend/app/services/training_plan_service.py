"""Service for AI-powered training plan generation using OpenAI"""
import json
import logging
import re
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from openai import OpenAI

from app.core.config import config
from app.db.schema import TrainingRequest, TrainingPlan, Activity, Athlete
from app.services.strava_db_service import strava_db_service

logger = logging.getLogger(__name__)


class TrainingPlanService:
    """Service for generating AI-powered personalized training plans"""
    
    def __init__(self):
        self.client = OpenAI(api_key=config.openai_api_key)
        self.model = config.openai_model
    
    def generate_training_plan(
        self, 
        db: Session, 
        athlete_id: int,
        request_data: Dict[str, Any]
    ) -> TrainingPlan:
        """
        Generate a personalized training plan using AI.
        
        Args:
            db: Database session
            athlete_id: Athlete's ID
            request_data: Training plan request data
        
        Returns:
            TrainingPlan object with the generated plan
        """
        try:
            # Get athlete info
            athlete = db.query(Athlete).filter(Athlete.id == athlete_id).first()
            if not athlete:
                raise ValueError(f"Athlete {athlete_id} not found")
            
            # Save the training request to database
            training_request = TrainingRequest(
                athlete_id=athlete_id,
                distance_objective=request_data['distance_objective'],
                pace_or_time_objective=request_data['pace_or_time_objective'],
                personal_record=request_data.get('personal_record'),
                weekly_kms=request_data.get('weekly_kms'),
                plan_duration_weeks=request_data['plan_duration_weeks'],
                training_days=request_data['training_days'],
                get_previous_activities_context=request_data.get('get_previous_activities_context', False)
            )
            db.add(training_request)
            db.commit()
            db.refresh(training_request)
            logger.info(f"Saved training request {training_request.id} for athlete {athlete_id}")
            
            # Build the prompt
            prompt = self._build_prompt(
                athlete=athlete,
                request_data=request_data,
                db=db if request_data.get('get_previous_activities_context') else None,
                athlete_id=athlete_id if request_data.get('get_previous_activities_context') else None
            )
            
            # Call OpenAI API
            logger.info(f"Generating training plan for athlete {athlete_id}")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert running coach and personal trainer. Your task is to generate a personalized running training plan based on the user's data and objectives. You will provide insightful analysis, a summary of the training plan, and a detailed, structured workout schedule in JSON format."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=4000
            )
            
            # Parse the AI response
            ai_response_text = response.choices[0].message.content
            
            # Log the response for debugging (first 500 chars)
            logger.debug(f"AI response preview: {ai_response_text[:500]}")
            
            # Try to extract JSON from the response
            # First, try to find JSON in markdown code blocks
            json_text = None
            
            # Try to extract from markdown code blocks (```json or ```)
            # First find code blocks, then extract JSON using balanced braces
            code_block_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?)\s*```', ai_response_text, re.MULTILINE | re.DOTALL)
            if code_block_match:
                # Extract the content between code block markers
                code_block_content = code_block_match.group(1).strip()
                # Find balanced braces within the code block
                brace_start = code_block_content.find('{')
                if brace_start != -1:
                    brace_count = 0
                    brace_end = -1
                    for i in range(brace_start, len(code_block_content)):
                        if code_block_content[i] == '{':
                            brace_count += 1
                        elif code_block_content[i] == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                brace_end = i
                                break
                    if brace_end != -1:
                        json_text = code_block_content[brace_start:brace_end + 1]
                        logger.info("Found JSON in markdown code block using balanced braces")
            else:
                # Try to find JSON object by finding balanced braces
                # Start from the first { and find the matching closing }
                brace_start = ai_response_text.find('{')
                if brace_start != -1:
                    brace_count = 0
                    brace_end = -1
                    for i in range(brace_start, len(ai_response_text)):
                        if ai_response_text[i] == '{':
                            brace_count += 1
                        elif ai_response_text[i] == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                brace_end = i
                                break
                    if brace_end != -1:
                        json_text = ai_response_text[brace_start:brace_end + 1]
                        logger.info("Found JSON using balanced brace matching")
                    else:
                        # Fallback to regex (might be incomplete)
                        json_match = re.search(r'\{[\s\S]*\}', ai_response_text)
                        if json_match:
                            json_text = json_match.group(0)
                            logger.info("Found JSON using regex fallback")
            
            if not json_text:
                logger.error(f"Could not find JSON in AI response. Response length: {len(ai_response_text)}")
                logger.error(f"Response preview: {ai_response_text[:1000]}")
                raise ValueError("Could not find JSON in AI response")
            
            # Try to extract insights and summary from the response
            insights = self._extract_section(ai_response_text, "Insights on the Objective", "Summary")
            summary = self._extract_section(ai_response_text, "Summary of the Plan Objective", "JSON")
            
            # Clean up common JSON issues
            # Remove trailing commas before closing braces/brackets
            json_text = re.sub(r',(\s*[}\]])', r'\1', json_text)
            
            # Parse the JSON training plan
            try:
                training_plan_json = json.loads(json_text)
            except json.JSONDecodeError as e:
                # Try to find the problematic line for better error reporting
                error_line = getattr(e, 'lineno', None) or getattr(e, 'pos', None)
                if error_line:
                    lines = json_text.split('\n')
                    # Estimate line number from position if lineno not available
                    if not isinstance(error_line, int) and hasattr(e, 'pos'):
                        # Count newlines up to error position
                        error_line = json_text[:e.pos].count('\n') + 1
                    if isinstance(error_line, int) and error_line <= len(lines):
                        logger.error(f"Error at line {error_line}: {lines[error_line - 1] if error_line > 0 else 'start of JSON'}")
                
                logger.error(f"Failed to parse JSON from AI response: {str(e)}")
                logger.error(f"JSON text length: {len(json_text)} chars")
                logger.error(f"JSON text that failed to parse (first 500 chars): {json_text[:500]}")
                logger.error(f"JSON text that failed to parse (last 500 chars): {json_text[-500:]}")
                raise ValueError(f"Invalid JSON in AI response: {str(e)}")
            
            # Validate the JSON structure
            if 'training_plan' not in training_plan_json:
                raise ValueError("Training plan JSON missing 'training_plan' key")
            
            # Create and save the training plan
            training_plan = TrainingPlan(
                request_id=training_request.id,
                athlete_id=athlete_id,
                insights=insights or "Training plan generated successfully.",
                summary=summary or "A personalized training plan has been created for you.",
                training_plan_json=training_plan_json,
                raw_response={
                    "openai_response": ai_response_text,
                    "request_data": request_data
                }
            )
            
            db.add(training_plan)
            db.commit()
            db.refresh(training_plan)
            
            logger.info(f"Successfully generated training plan {training_plan.id} for athlete {athlete_id}")
            return training_plan
            
        except Exception as e:
            logger.error(f"Error generating training plan: {str(e)}")
            db.rollback()
            raise
    
    def _build_prompt(
        self,
        athlete: Athlete,
        request_data: Dict[str, Any],
        db: Optional[Session] = None,
        athlete_id: Optional[int] = None
    ) -> str:
        """
        Build the prompt for the AI based on user data and optional historical context.
        
        Args:
            athlete: Athlete object
            request_data: Training plan request data
            db: Database session (if historical context is needed)
            athlete_id: Athlete ID (if historical context is needed)
        
        Returns:
            Formatted prompt string
        """
        prompt = f"""Please create a personalized running training plan based on the following specifications.

User Data & Objectives:

Primary Goal:
- Distance Objective: {request_data['distance_objective']}
- Pace or Time Objective: {request_data['pace_or_time_objective']}

Current Fitness Level:
- Personal Record (PR): {request_data.get('personal_record', 'Not specified')}
- Average Weekly Kilometers: {request_data.get('weekly_kms', 'Not specified')} km

Training Plan Structure:
- Plan Duration: {request_data['plan_duration_weeks']} weeks
- Training Days: {', '.join(request_data['training_days'])}
"""
        
        # Add historical context if requested
        if request_data.get('get_previous_activities_context') and db and athlete_id:
            activities_context = self._get_activities_context(db, athlete_id)
            if activities_context:
                prompt += f"\nHistorical Context:\n{activities_context}\n"
        
        prompt += """
Output Format:

Your response must be divided into three distinct sections:

1. Insights on the Objective: Provide a brief analysis of the user's goal based on their current fitness level. Comment on the achievability and offer a motivational and encouraging perspective.

2. Summary of the Plan Objective: Briefly summarize the training plan's focus, such as building endurance, improving speed, or a combination. Mention the key types of workouts that will be included.

3. JSON Formatted Training Plan: Generate a JSON object with a clear, hierarchical structure. The root object should contain a key "training_plan". This key should hold an array of objects, where each object represents a week. Each week object should contain the week number and a "days" array with objects for each training session. Each session object must include the day of the week, the type of training (e.g., "Easy Run," "Intervals," "Long Run," "Rest"), and a detailed description of the activity.

IMPORTANT: The JSON must be valid JSON. Do not include any markdown formatting around the JSON - output it as plain JSON text. The JSON should start with {{ and end with }}.

Example of JSON Structure:
{{
  "training_plan": [
    {{
      "week": 1,
      "days": [
        {{
          "day": "Monday",
          "activity_type": "Easy Run",
          "details": "5km at a conversational pace. Focus on consistency."
        }},
        {{
          "day": "Wednesday",
          "activity_type": "Intervals",
          "details": "1km warm-up. 6x400m at target 5k pace with 400m easy jog recovery. 1km cool-down."
        }},
        {{
          "day": "Friday",
          "activity_type": "Rest",
          "details": "Rest day. Light stretching or a short walk is optional."
        }},
        {{
          "day": "Sunday",
          "activity_type": "Long Run",
          "details": "8km at a comfortable, steady pace. This is about building endurance."
        }}
      ]
    }}
  ]
}}

Please ensure that:
- The plan covers all {request_data['plan_duration_weeks']} weeks
- Training sessions are scheduled only on the specified days: {', '.join(request_data['training_days'])}
- The plan progressively builds towards the goal
- The plan is realistic and considers the user's current fitness level
- The JSON is valid and properly formatted (no trailing commas, all strings properly quoted)
"""
        
        return prompt
    
    def _get_activities_context(self, db: Session, athlete_id: int) -> str:
        """
        Get a summary of activities from the last 4 weeks for context.
        
        Args:
            db: Database session
            athlete_id: Athlete ID
        
        Returns:
            Formatted context string
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(weeks=4)
            activities = db.query(Activity).filter(
                Activity.athlete_id == athlete_id,
                Activity.sport_type == 'Run',
                Activity.start_date >= cutoff_date
            ).order_by(Activity.start_date.desc()).all()
            
            if not activities:
                return "No previous activities found in the last 4 weeks."
            
            # Group by week
            context = "Previous Activities (Last 4 weeks):\n"
            week_summaries = []
            
            for week in range(4):
                week_start = datetime.utcnow() - timedelta(weeks=week+1)
                week_end = datetime.utcnow() - timedelta(weeks=week)
                
                week_activities = [
                    a for a in activities 
                    if week_start <= a.start_date < week_end
                ]
                
                if week_activities:
                    total_distance = sum(a.distance for a in week_activities) / 1000  # Convert to km
                    total_time = sum(a.moving_time for a in week_activities) / 60  # Convert to minutes
                    run_count = len(week_activities)
                    
                    # Get activity types summary
                    activities_summary = []
                    for activity in week_activities[:5]:  # Limit to 5 activities per week
                        distance_km = activity.distance / 1000
                        pace_min_per_km = None
                        if activity.average_speed and activity.average_speed > 0:
                            pace_min_per_km = 1000 / (activity.average_speed * 60)
                            pace_str = f"{int(pace_min_per_km)}:{int((pace_min_per_km % 1) * 60):02d}"
                        else:
                            pace_str = "N/A"
                        
                        activities_summary.append(f"{distance_km:.1f}km ({pace_str} min/km)")
                    
                    week_summaries.append(
                        f"Week {week+1}: {run_count} runs, {total_distance:.1f}km total, "
                        f"{int(total_time)} minutes - {', '.join(activities_summary)}"
                    )
            
            context += "\n".join(week_summaries)
            return context
            
        except Exception as e:
            logger.warning(f"Error getting activities context: {str(e)}")
            return "Unable to retrieve previous activities."
    
    def _extract_section(self, text: str, start_marker: str, end_marker: str) -> str:
        """
        Extract a section from the AI response text.
        
        Args:
            text: Full response text
            start_marker: Start marker for the section
            end_marker: End marker for the section
        
        Returns:
            Extracted section text or empty string
        """
        start_idx = text.find(start_marker)
        if start_idx == -1:
            return ""
        
        start_idx += len(start_marker)
        end_idx = text.find(end_marker, start_idx)
        if end_idx == -1:
            end_idx = len(text)
        
        return text[start_idx:end_idx].strip()
    
    def get_latest_plan(
        self,
        db: Session,
        athlete_id: int
    ) -> Optional[TrainingPlan]:
        """
        Get the most recent training plan for an athlete.
        
        Args:
            db: Database session
            athlete_id: Athlete's ID
        
        Returns:
            Latest TrainingPlan or None
        """
        return db.query(TrainingPlan).filter(
            TrainingPlan.athlete_id == athlete_id
        ).order_by(desc(TrainingPlan.created_at)).first()
    
    def get_plan_by_request_id(
        self,
        db: Session,
        request_id: int
    ) -> Optional[TrainingPlan]:
        """
        Get a training plan by request ID.
        
        Args:
            db: Database session
            request_id: Training request ID
        
        Returns:
            TrainingPlan or None
        """
        return db.query(TrainingPlan).filter(
            TrainingPlan.request_id == request_id
        ).first()
    
    def get_all_plans(
        self,
        db: Session,
        athlete_id: int,
        limit: int = 10
    ) -> list[TrainingPlan]:
        """
        Get all training plans for an athlete.
        
        Args:
            db: Database session
            athlete_id: Athlete's ID
            limit: Maximum number of plans to return
        
        Returns:
            List of TrainingPlan objects
        """
        return db.query(TrainingPlan).filter(
            TrainingPlan.athlete_id == athlete_id
        ).order_by(desc(TrainingPlan.created_at)).limit(limit).all()


# Singleton instance
training_plan_service = TrainingPlanService()

