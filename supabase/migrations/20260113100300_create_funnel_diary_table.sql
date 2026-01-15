-- Criar tabela funnel_diary para diário de bordo do funil

CREATE TABLE IF NOT EXISTS public.funnel_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Sem updated_at pois entradas são imutáveis (regra de negócio)
);

-- Índice para busca por funil (ordenado por data)
CREATE INDEX IF NOT EXISTS idx_funnel_diary_funnel_id ON public.funnel_diary(funnel_id, created_at DESC);

-- RLS: apenas leitura após criação (imutável)
ALTER TABLE public.funnel_diary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read" ON public.funnel_diary FOR SELECT USING (true);
CREATE POLICY "Allow insert authenticated" ON public.funnel_diary FOR INSERT WITH CHECK (true);
-- Sem UPDATE ou DELETE policies (entradas são imutáveis)
