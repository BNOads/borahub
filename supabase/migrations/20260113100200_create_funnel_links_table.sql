-- Criar tabela funnel_links para links operacionais do funil

CREATE TABLE IF NOT EXISTS public.funnel_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('captura', 'vendas', 'leads', 'compradores', 'drive', 'criativos', 'pesquisa', 'custom')),
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER update_funnel_links_updated_at
  BEFORE UPDATE ON public.funnel_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índice para busca por funil
CREATE INDEX IF NOT EXISTS idx_funnel_links_funnel_id ON public.funnel_links(funnel_id);

-- RLS
ALTER TABLE public.funnel_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON public.funnel_links FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.funnel_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.funnel_links FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all" ON public.funnel_links FOR DELETE USING (true);
