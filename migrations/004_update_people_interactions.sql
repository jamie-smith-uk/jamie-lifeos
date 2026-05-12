-- Migration 004: update people and interactions tables
-- Adds missing created_at and updated_at columns to people table
-- Adds interacted_at column to interactions table while preserving created_at

-- Add created_at and updated_at columns to people table
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add interacted_at column to interactions table (nullable)
ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS interacted_at timestamptz;

-- Ensure interactions table has proper created_at column with NOT NULL constraint
-- First add the column if it doesn't exist with proper default
ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

