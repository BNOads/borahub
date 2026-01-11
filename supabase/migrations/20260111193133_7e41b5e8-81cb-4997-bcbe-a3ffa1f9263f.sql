-- Criação da tabela de funis
CREATE TABLE IF NOT EXISTS public.funnels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  product_name TEXT,
  predicted_investment NUMERIC,
  drive_link TEXT,
  dashboard_link TEXT,
  briefing_link TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'finished', 'archived')),
  is_active BOOLEAN DEFAULT true,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_funnels_updated_at ON public.funnels;
CREATE TRIGGER update_funnels_updated_at
  BEFORE UPDATE ON public.funnels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_funnels_status ON public.funnels(status);
CREATE INDEX IF NOT EXISTS idx_funnels_is_active ON public.funnels(is_active);

-- Habilitar RLS
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Enable read access for all users" ON public.funnels;
CREATE POLICY "Enable read access for all users"
ON public.funnels FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.funnels;
CREATE POLICY "Enable insert for all users"
ON public.funnels FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON public.funnels;
CREATE POLICY "Enable update for all users"
ON public.funnels FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON public.funnels;
CREATE POLICY "Enable delete for all users"
ON public.funnels FOR DELETE
USING (true);