from datetime import datetime
from typing import Optional

from sqlalchemy import String, create_engine, Float, Integer, DateTime, BigInteger, Text, JSON, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, relationship
from sqlalchemy import ForeignKey

from app.core.config import config

engine = create_engine(config.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class User(Base):
    """Stores user authentication information"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    firstname: Mapped[Optional[str]] = mapped_column(String(100))
    lastname: Mapped[Optional[str]] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Athlete(Base):
    """Stores Strava athlete information"""
    __tablename__ = "athletes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)  # Strava athlete ID
    username: Mapped[Optional[str]] = mapped_column(String(100))
    firstname: Mapped[Optional[str]] = mapped_column(String(100))
    lastname: Mapped[Optional[str]] = mapped_column(String(100))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(100))
    country: Mapped[Optional[str]] = mapped_column(String(100))
    sex: Mapped[Optional[str]] = mapped_column(String(1))
    weight: Mapped[Optional[float]] = mapped_column(Float)
    profile: Mapped[Optional[str]] = mapped_column(Text)  # Profile picture URL
    stats: Mapped[Optional[dict]] = mapped_column(JSON)  # Athlete stats from Strava API
    stats_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime)  # When stats were last updated
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    activities: Mapped[list["Activity"]] = relationship(back_populates="athlete")


class Activity(Base):
    """Stores Strava activity data"""
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)  # Strava activity ID
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athletes.id"))
    name: Mapped[str] = mapped_column(String(255))
    distance: Mapped[float] = mapped_column(Float)  # in meters
    moving_time: Mapped[int] = mapped_column(Integer)  # in seconds
    elapsed_time: Mapped[int] = mapped_column(Integer)  # in seconds
    total_elevation_gain: Mapped[float] = mapped_column(Float)  # in meters
    sport_type: Mapped[str] = mapped_column(String(50))
    start_date: Mapped[datetime] = mapped_column(DateTime)
    start_date_local: Mapped[datetime] = mapped_column(DateTime)
    timezone: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Performance metrics
    average_speed: Mapped[Optional[float]] = mapped_column(Float)  # in m/s
    max_speed: Mapped[Optional[float]] = mapped_column(Float)  # in m/s
    average_heartrate: Mapped[Optional[float]] = mapped_column(Float)
    max_heartrate: Mapped[Optional[float]] = mapped_column(Float)
    average_cadence: Mapped[Optional[float]] = mapped_column(Float)
    
    # Location data
    start_latitude: Mapped[Optional[float]] = mapped_column(Float)
    start_longitude: Mapped[Optional[float]] = mapped_column(Float)
    end_latitude: Mapped[Optional[float]] = mapped_column(Float)
    end_longitude: Mapped[Optional[float]] = mapped_column(Float)
    
    # Additional data
    achievement_count: Mapped[Optional[int]] = mapped_column(Integer)
    kudos_count: Mapped[Optional[int]] = mapped_column(Integer)
    comment_count: Mapped[Optional[int]] = mapped_column(Integer)
    athlete_count: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Raw JSON data from Strava
    raw_data: Mapped[Optional[dict]] = mapped_column(JSON)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    athlete: Mapped["Athlete"] = relationship(back_populates="activities")
    laps: Mapped[list["Lap"]] = relationship(back_populates="activity", cascade="all, delete-orphan")


class Lap(Base):
    """Stores lap data for activities"""
    __tablename__ = "laps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    activity_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("activities.id", ondelete="CASCADE"))
    lap_index: Mapped[int] = mapped_column(Integer)  # Lap number within the activity
    
    # Lap metrics
    name: Mapped[Optional[str]] = mapped_column(String(255))
    distance: Mapped[float] = mapped_column(Float)  # in meters
    moving_time: Mapped[int] = mapped_column(Integer)  # in seconds
    elapsed_time: Mapped[int] = mapped_column(Integer)  # in seconds
    total_elevation_gain: Mapped[Optional[float]] = mapped_column(Float)  # in meters
    
    # Performance metrics
    average_speed: Mapped[Optional[float]] = mapped_column(Float)  # in m/s
    max_speed: Mapped[Optional[float]] = mapped_column(Float)  # in m/s
    average_heartrate: Mapped[Optional[float]] = mapped_column(Float)
    max_heartrate: Mapped[Optional[float]] = mapped_column(Float)
    average_cadence: Mapped[Optional[float]] = mapped_column(Float)
    
    # Pace zone
    pace_zone: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Start/end times
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Raw JSON data
    raw_data: Mapped[Optional[dict]] = mapped_column(JSON)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    activity: Mapped["Activity"] = relationship(back_populates="laps")


class TrainingAnalysis(Base):
    """Stores AI-generated training analysis and insights"""
    __tablename__ = "training_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athletes.id"))
    
    # Analysis content
    summary: Mapped[str] = mapped_column(Text)  # Short summary of training load
    training_load_insight: Mapped[str] = mapped_column(Text)  # Analysis of current training load
    tips: Mapped[str] = mapped_column(Text)  # Tips for next runs
    
    # Metadata about the analysis
    activities_analyzed_count: Mapped[int] = mapped_column(Integer)  # Number of activities analyzed
    analysis_period_start: Mapped[datetime] = mapped_column(DateTime)  # Start date of analyzed period
    analysis_period_end: Mapped[datetime] = mapped_column(DateTime)  # End date of analyzed period
    
    # Raw AI response for reference
    raw_response: Mapped[Optional[dict]] = mapped_column(JSON)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    athlete: Mapped["Athlete"] = relationship()


class TrainingRequest(Base):
    """Stores user training plan requests"""
    __tablename__ = "training_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athletes.id"))
    
    # User input data
    distance_objective: Mapped[str] = mapped_column(String(100))  # e.g., "10km", "Half Marathon"
    pace_or_time_objective: Mapped[str] = mapped_column(String(100))  # e.g., "4:30 min/km" or "Sub 40 minutes"
    personal_record: Mapped[Optional[str]] = mapped_column(String(100))  # e.g., "39:42 in 10km"
    weekly_kms: Mapped[Optional[float]] = mapped_column(Float)  # Average weekly kilometers
    plan_duration_weeks: Mapped[int] = mapped_column(Integer)  # Plan duration in weeks
    training_days: Mapped[list[str]] = mapped_column(JSON)  # List of training days, e.g., ["Monday", "Wednesday", "Friday", "Sunday"]
    get_previous_activities_context: Mapped[bool] = mapped_column(default=False)  # Whether to include historical context
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    athlete: Mapped["Athlete"] = relationship()
    training_plan: Mapped[Optional["TrainingPlan"]] = relationship(back_populates="request", uselist=False)


class TrainingPlan(Base):
    """Stores AI-generated training plans"""
    __tablename__ = "training_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[int] = mapped_column(Integer, ForeignKey("training_requests.id"), unique=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athletes.id"))
    
    # AI-generated content
    insights: Mapped[str] = mapped_column(Text)  # Insights on the objective
    summary: Mapped[str] = mapped_column(Text)  # Summary of the plan objective
    training_plan_json: Mapped[dict] = mapped_column(JSON)  # The structured training plan in JSON format
    
    # Raw AI response for reference
    raw_response: Mapped[Optional[dict]] = mapped_column(JSON)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    request: Mapped["TrainingRequest"] = relationship(back_populates="training_plan")
    athlete: Mapped["Athlete"] = relationship()
    completed_activities: Mapped[list["TrainingPlanActivity"]] = relationship(back_populates="plan", cascade="all, delete-orphan")


class TrainingPlanActivity(Base):
    """Stores completion status for individual activities in a training plan"""
    __tablename__ = "training_plan_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("training_plans.id", ondelete="CASCADE"))
    week_number: Mapped[int] = mapped_column(Integer)  # Week number (1-based)
    day: Mapped[str] = mapped_column(String(20))  # Day of the week
    activity_index: Mapped[int] = mapped_column(Integer)  # Index of the activity in the week's days array
    is_completed: Mapped[bool] = mapped_column(default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    plan: Mapped["TrainingPlan"] = relationship(back_populates="completed_activities")
    
    # Unique constraint: one completion record per activity
    __table_args__ = (
        UniqueConstraint('plan_id', 'week_number', 'day', 'activity_index', name='uq_plan_activity'),
    )
