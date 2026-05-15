-- Migration 001: people and interactions tables
-- Tracks people in the user's life and their interaction history.

CREATE TABLE IF NOT EXISTS people (
  id                  serial          PRIMARY KEY,
  name                text            NOT NULL,
  relationship_type   text,
  how_known           text,
  notes               text,
  last_interaction_at timestamptz
);

CREATE TABLE IF NOT EXISTS interactions (
  id               serial      PRIMARY KEY,
  person_id        integer     REFERENCES people(id),
  interaction_type text,
  notes            text,
  created_at       timestamptz DEFAULT now()
);
