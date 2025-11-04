-- Migration: Add athlete stats columns to athletes table
-- Date: 2024-01-XX
-- Description: Adds stats and stats_updated_at columns to store athlete statistics from Strava API

-- Add stats column (JSON type to store athlete statistics)
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS stats JSON;

-- Add stats_updated_at column (timestamp to track when stats were last updated)
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS stats_updated_at TIMESTAMP;

-- Add comment to document the columns
COMMENT ON COLUMN athletes.stats IS 'Athlete statistics from Strava API (stored as JSON)';
COMMENT ON COLUMN athletes.stats_updated_at IS 'Timestamp when athlete stats were last updated from Strava API';

