-- Migration: Add training_requests and training_plans tables
-- Created: 2025-01-XX

-- Create training_requests table
CREATE TABLE IF NOT EXISTS training_requests (
    id SERIAL PRIMARY KEY,
    athlete_id BIGINT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    distance_objective VARCHAR(100) NOT NULL,
    pace_or_time_objective VARCHAR(100) NOT NULL,
    personal_record VARCHAR(100),
    weekly_kms DOUBLE PRECISION,
    plan_duration_weeks INTEGER NOT NULL,
    training_days JSONB NOT NULL,
    get_previous_activities_context BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create training_plans table
CREATE TABLE IF NOT EXISTS training_plans (
    id SERIAL PRIMARY KEY,
    request_id INTEGER UNIQUE NOT NULL REFERENCES training_requests(id) ON DELETE CASCADE,
    athlete_id BIGINT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    insights TEXT NOT NULL,
    summary TEXT NOT NULL,
    training_plan_json JSONB NOT NULL,
    raw_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_training_requests_athlete_id ON training_requests(athlete_id);
CREATE INDEX IF NOT EXISTS idx_training_requests_created_at ON training_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_training_plans_athlete_id ON training_plans(athlete_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_request_id ON training_plans(request_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_created_at ON training_plans(created_at);

