-- Migration 003: nudges table
-- Tracks nudges to remind the user about important life events and interactions.

CREATE TABLE IF NOT EXISTS nudges (
  id            serial      PRIMARY KEY,
  person_id     integer     REFERENCES people(id) ON DELETE SET NULL,
  life_event_id integer     REFERENCES life_events(id) ON DELETE SET NULL,
  message       text        NOT NULL,
  trigger_at    timestamptz NOT NULL,
  status        text        NOT NULL DEFAULT 'pending',
  sent_at       timestamptz,
  dismissed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nudges_status_check CHECK (status IN ('pending', 'sent', 'dismissed'))
);