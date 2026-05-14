-- Migration 006: strava_activities table
-- Stores Strava activity data with core activity fields and metadata.

CREATE TABLE IF NOT EXISTS strava_activities (
  id                    serial         PRIMARY KEY,
  strava_id             bigint         NOT NULL UNIQUE,
  athlete_id            bigint         NOT NULL REFERENCES strava_credentials(athlete_id) ON DELETE CASCADE,
  name                  text           NOT NULL,
  sport_type            text           NOT NULL,
  start_date            timestamptz    NOT NULL,
  distance_m            numeric(10,2),
  moving_time_s         integer,
  elapsed_time_s        integer,
  total_elevation_gain  numeric(8,2),
  average_speed_ms      numeric(8,4),
  max_speed_ms          numeric(8,4),
  average_heartrate     numeric(6,2),
  max_heartrate         numeric(6,2),
  average_watts         numeric(8,2),
  kilojoules            numeric(10,2),
  suffer_score          integer,
  raw_data              jsonb,
  synced_at             timestamptz    NOT NULL DEFAULT now()
);