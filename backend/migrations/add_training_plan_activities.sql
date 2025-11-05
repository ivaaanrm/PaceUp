-- Migration: Add training_plan_activities table
-- Created: 2025-01-XX

-- Create training_plan_activities table
CREATE TABLE IF NOT EXISTS training_plan_activities (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    day VARCHAR(20) NOT NULL,
    activity_index INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, week_number, day, activity_index)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_training_plan_activities_plan_id ON training_plan_activities(plan_id);
CREATE INDEX IF NOT EXISTS idx_training_plan_activities_completed ON training_plan_activities(plan_id, is_completed);

