-- Tabela de historico de UTMs geradas
CREATE TABLE IF NOT EXISTS public.utm_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_url TEXT NOT NULL,
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  utm_term TEXT,
  utm_content TEXT,
  full_url TEXT NOT NULL,
  generation_type TEXT DEFAULT 'individual', -- individual ou bulk
  batch_id UUID, -- agrupa UTMs geradas em massa
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_utm_history_created_by ON public.utm_history(created_by);
CREATE INDEX IF NOT EXISTS idx_utm_history_batch ON public.utm_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_utm_history_created_at ON public.utm_history(created_at DESC);

-- RLS
ALTER TABLE public.utm_history ENABLE ROW LEVEL SECURITY;

-- Politicas: usuarios podem ver e gerenciar suas proprias UTMs
DROP POLICY IF EXISTS "Users can view own UTMs" ON public.utm_history;
CREATE POLICY "Users can view own UTMs"
  ON public.utm_history FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can create UTMs" ON public.utm_history;
CREATE POLICY "Users can create UTMs"
  ON public.utm_history FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete own UTMs" ON public.utm_history;
CREATE POLICY "Users can delete own UTMs"
  ON public.utm_history FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
