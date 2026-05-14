-- Migration 005: strava_credentials table
-- Stores Strava OAuth credentials and metadata for the user's Strava account.

CREATE TABLE IF NOT EXISTS strava_credentials (
    id               SERIAL PRIMARY KEY,
    athlete_id       BIGINT      NOT NULL UNIQUE,
    access_token     TEXT        NOT NULL,
    refresh_token    TEXT        NOT NULL,
    expires_at       TIMESTAMPTZ NOT NULL,
    scope            TEXT        NOT NULL DEFAULT 'activity:read_all',
    last_synced_at   TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);