
-- Adicionar colunas para armazenar valores originais em moeda estrangeira
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS original_value NUMERIC,
ADD COLUMN IF NOT EXISTS original_currency TEXT;

-- Comentários explicativos
COMMENT ON COLUMN public.sales.original_value IS 'Valor original da venda quando em moeda estrangeira (antes da conversão)';
COMMENT ON COLUMN public.sales.original_currency IS 'Código da moeda original (EUR, USD, etc.) quando diferente de BRL';
