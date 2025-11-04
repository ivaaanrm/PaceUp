from datetime import datetime
from typing import Optional

from sqlalchemy import String, create_engine, Float, Integer, DateTime, BigInteger, Text, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, relationship
from sqlalchemy import ForeignKey

from app.core.config import config

engine = create_engine(config.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


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
