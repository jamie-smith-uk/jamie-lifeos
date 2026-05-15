-- Migration 0009: pending_voice_intents table
-- Stores voice message transcriptions with a TTL for the confirmation workflow.

CREATE TABLE IF NOT EXISTS pending_voice_intents (
  id               serial      PRIMARY KEY,
  chat_id          bigint      NOT NULL,
  transcription    text        NOT NULL,
  telegram_file_id text        NOT NULL,
  expires_at       timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Index on chat_id for efficient lookups by chat session
CREATE INDEX IF NOT EXISTS idx_pending_voice_intents_chat_id
  ON pending_voice_intents (chat_id);