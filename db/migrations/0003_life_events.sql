-- Migration 002: life_events table
-- Tracks important life events for people in the user's network.

CREATE TABLE IF NOT EXISTS life_events (
  id            serial      PRIMARY KEY,
  person_id     integer     NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  event_type    text        NOT NULL,
  event_date    date        NOT NULL,
  is_recurring  boolean     NOT NULL DEFAULT false,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);