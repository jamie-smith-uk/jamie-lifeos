-- Migration 005: strava_credentials table
-- Stores Strava OAuth credentials and metadata for the user's Strava account.

CREATE TABLE IF NOT EXISTS strava_credentials (
    id               serial      PRIMARY KEY,
    athlete_id       bigint      NOT NULL UNIQUE,
    access_token     text        NOT NULL,
    refresh_token    text        NOT NULL,
    expires_at       timestamptz NOT NULL,
    scope            text        NOT NULL DEFAULT 'activity:read_all',
    last_synced_at   timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);