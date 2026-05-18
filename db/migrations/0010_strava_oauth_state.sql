-- Migration 0010: strava_oauth_state
-- Stores short-lived CSRF state tokens for the Strava OAuth flow.
-- Each token is single-use and expires after 10 minutes.

CREATE TABLE IF NOT EXISTS strava_oauth_state (
  id         SERIAL PRIMARY KEY,
  state_token TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

-- Clean up expired tokens automatically
CREATE INDEX IF NOT EXISTS idx_strava_oauth_state_expires_at
  ON strava_oauth_state (expires_at);
