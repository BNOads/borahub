-- =====================================================
-- GARANTIR QUE TODAS AS COLUNAS EXISTAM NA TABELA FUNNELS
-- =====================================================

-- Identificação
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS funnel_type TEXT;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';

-- Informações do Funil
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS lesson_type TEXT;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS launch_type TEXT;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS manager TEXT;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS client TEXT;

-- Verba por etapa (PORCENTAGEM - valores de 0 a 100)
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_captacao_percent NUMERIC DEFAULT 0;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_aquecimento_percent NUMERIC DEFAULT 0;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_evento_percent NUMERIC DEFAULT 0;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_venda_percent NUMERIC DEFAULT 0;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_lembrete_percent NUMERIC DEFAULT 0;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_impulsionamento_percent NUMERIC DEFAULT 0;

-- Metas e Parâmetros
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS ticket_medio NUMERIC;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS leads_goal INTEGER;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS cpl_goal NUMERIC;

-- Datas Operacionais
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS captacao_start DATE;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS captacao_end DATE;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS aquecimento_start DATE;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS aquecimento_end DATE;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS cpl_start DATE;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS cpl_end DATE;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS lembrete_start DATE;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS carrinho_start DATE;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS fechamento_date DATE;

-- Índices para datas
CREATE INDEX IF NOT EXISTS idx_funnels_captacao_start ON public.funnels(captacao_start);
CREATE INDEX IF NOT EXISTS idx_funnels_fechamento_date ON public.funnels(fechamento_date);
