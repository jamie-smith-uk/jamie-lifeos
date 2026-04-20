-- 0001_init.sql
-- Initial schema migration.
--
-- Creates the migrations tracking table and the conversation_context table
-- used by the orchestrator to maintain per-chat message history and store
-- the active confirmation payload for the two-step confirmation pattern.

-- ---------------------------------------------------------------------------
-- migrations
-- Tracks which SQL migration files have been applied. Created here as a
-- safety net; the runner (migrate.ts) also creates it on startup so the
-- table is guaranteed to exist before this file is applied.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migrations (
    id         SERIAL      PRIMARY KEY,
    name       TEXT        NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- conversation_context
-- One row per message turn (user or assistant) for every chat_id.
-- active_confirmation is a nullable JSONB column written on the most-recent
-- row for a chat_id when the agent proposes a write action that requires
-- user confirmation. It is nulled out on confirm, cancel, or expiry.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_context (
    id                   SERIAL      PRIMARY KEY,
    chat_id              BIGINT      NOT NULL,
    role                 TEXT        NOT NULL,
    content              TEXT        NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active_confirmation  JSONB       NULL,
    CONSTRAINT conversation_context_role_check CHECK (role IN ('user', 'assistant'))
);

-- Index on (chat_id, created_at DESC) so that history lookups and
-- confirmation reads by chat_id are efficient, returning newest rows first.
CREATE INDEX IF NOT EXISTS idx_conversation_context_chat_id_created_at
    ON conversation_context (chat_id, created_at DESC);
