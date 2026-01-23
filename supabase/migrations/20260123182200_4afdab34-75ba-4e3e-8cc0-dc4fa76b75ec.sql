-- Add funnel_source column to sales table
ALTER TABLE public.sales 
ADD COLUMN funnel_source TEXT DEFAULT NULL;

-- Create index for filtering by funnel source
CREATE INDEX idx_sales_funnel_source ON public.sales(funnel_source);

-- Add comment for documentation
COMMENT ON COLUMN public.sales.funnel_source IS 'Origem do funil de vendas (Evento, Lançamento, Ascensão, Social selling, Tráfego, Sessão, Disparo, etc.)';