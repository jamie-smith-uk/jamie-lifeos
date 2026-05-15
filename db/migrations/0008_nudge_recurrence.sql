-- Migration 0008: add recurrence to nudges
-- Allows nudges to repeat on a schedule after being sent.

ALTER TABLE nudges
  ADD COLUMN IF NOT EXISTS recurrence text
    CONSTRAINT nudges_recurrence_check
    CHECK (recurrence IN ('daily', 'weekly', 'monthly', 'yearly'));
