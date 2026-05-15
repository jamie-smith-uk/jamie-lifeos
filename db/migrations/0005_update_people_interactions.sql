-- Migration 004: align people and interactions tables with architecture schema
-- Adds missing columns, enforces NOT NULL constraints, and upgrades FK on interactions.

-- People: add created_at and updated_at
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- People: relationship_type must be NOT NULL (backfill NULLs before enforcing)
UPDATE people SET relationship_type = 'unknown' WHERE relationship_type IS NULL;
ALTER TABLE people ALTER COLUMN relationship_type SET NOT NULL;

-- Interactions: add interacted_at (new column for when the interaction occurred)
ALTER TABLE interactions
  ADD COLUMN IF NOT EXISTS interacted_at timestamptz NOT NULL DEFAULT now();

-- Interactions: created_at must be NOT NULL (backfill NULLs before enforcing)
UPDATE interactions SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE interactions ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE interactions ALTER COLUMN created_at SET DEFAULT now();

-- Interactions: upgrade person_id to NOT NULL with ON DELETE CASCADE
UPDATE interactions SET person_id = NULL WHERE person_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM people WHERE people.id = interactions.person_id);
DELETE FROM interactions WHERE person_id IS NULL;
ALTER TABLE interactions
  DROP CONSTRAINT IF EXISTS interactions_person_id_fkey,
  ADD CONSTRAINT interactions_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  ALTER COLUMN person_id SET NOT NULL;
