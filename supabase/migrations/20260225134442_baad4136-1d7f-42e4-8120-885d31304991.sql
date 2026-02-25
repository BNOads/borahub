-- Remove duplicates keeping the most recent one
DELETE FROM public.strategic_leads a
USING public.strategic_leads b
WHERE a.source_row_id IS NOT NULL
  AND a.source_row_id = b.source_row_id
  AND a.session_id = b.session_id
  AND a.created_at < b.created_at;

-- Now create unique index
CREATE UNIQUE INDEX idx_strategic_leads_source_row ON public.strategic_leads(source_row_id, session_id) WHERE source_row_id IS NOT NULL;
