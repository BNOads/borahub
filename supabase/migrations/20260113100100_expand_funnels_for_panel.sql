-- Expandir tabela funnels para o Painel de Funil

-- Identificação
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS funnel_type TEXT;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private'));

-- Verba por etapa
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_captacao NUMERIC DEFAULT 0;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_aquecimento NUMERIC DEFAULT 0;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_evento NUMERIC DEFAULT 0;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_venda NUMERIC DEFAULT 0;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_lembrete NUMERIC DEFAULT 0;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_impulsionamento NUMERIC DEFAULT 0;

-- Informações do Funil
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS lesson_type TEXT;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS launch_type TEXT;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS manager TEXT;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS client TEXT;

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

-- Índices para datas (útil para queries de próximo marco)
CREATE INDEX IF NOT EXISTS idx_funnels_captacao_start ON public.funnels(captacao_start);
CREATE INDEX IF NOT EXISTS idx_funnels_fechamento_date ON public.funnels(fechamento_date);
