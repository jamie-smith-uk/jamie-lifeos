-- 0009_pending_voice_intents.sql
-- Migration for pending_voice_intents table
--
-- Creates the pending_voice_intents table to store voice message transcriptions
-- temporarily while waiting for user confirmation. Used by the voice message
-- processing workflow to handle the two-step confirmation pattern for voice intents.

-- ---------------------------------------------------------------------------
-- pending_voice_intents
-- Stores voice message transcriptions with a TTL for the confirmation workflow.
-- Each row represents a voice message that has been transcribed but not yet
-- processed into an action by the agent.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_voice_intents (
    id               SERIAL      PRIMARY KEY,
    chat_id          BIGINT      NOT NULL,
    transcription    TEXT        NOT NULL,
    telegram_file_id TEXT        NOT NULL,
    expires_at       TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on chat_id for efficient lookups by chat session
CREATE INDEX IF NOT EXISTS idx_pending_voice_intents_chat_id
    ON pending_voice_intents (chat_id);