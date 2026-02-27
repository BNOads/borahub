
-- Add Google Calendar sync columns to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS google_calendar_source TEXT;

-- Index for fast lookup by google_calendar_id
CREATE INDEX IF NOT EXISTS idx_events_google_calendar_id ON public.events (google_calendar_id) WHERE google_calendar_id IS NOT NULL;
