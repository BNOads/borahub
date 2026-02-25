-- Drop partial index and create a proper unique constraint
DROP INDEX IF EXISTS idx_strategic_leads_source_row;

-- Set null source_row_ids to a generated value to avoid conflicts
UPDATE public.strategic_leads SET source_row_id = 'legacy_' || id WHERE source_row_id IS NULL;

-- Add proper unique constraint
ALTER TABLE public.strategic_leads ADD CONSTRAINT uq_strategic_leads_source_session UNIQUE (source_row_id, session_id);
