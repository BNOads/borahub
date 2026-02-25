
CREATE TABLE public.strategic_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.strategic_sessions(id) ON DELETE CASCADE,
  session_name TEXT,
  status TEXT NOT NULL DEFAULT 'ok',
  total_rows INTEGER DEFAULT 0,
  duplicates_removed INTEGER DEFAULT 0,
  error_message TEXT,
  source TEXT DEFAULT 'cron',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sync logs"
ON public.strategic_sync_logs FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Service role can insert sync logs"
ON public.strategic_sync_logs FOR INSERT
WITH CHECK (true);
