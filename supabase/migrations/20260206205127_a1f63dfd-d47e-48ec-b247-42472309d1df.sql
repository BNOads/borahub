
-- Coluna para armazenar nomes customizados das datas-chave fixas
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS date_labels JSONB DEFAULT '{}';

-- Tabela para datas importantes adicionais
CREATE TABLE public.funnel_custom_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  color TEXT NOT NULL DEFAULT 'border-purple-400 text-purple-600 dark:text-purple-400',
  bg_color TEXT NOT NULL DEFAULT 'bg-purple-50 dark:bg-purple-900/20',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_custom_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view custom dates"
  ON public.funnel_custom_dates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert custom dates"
  ON public.funnel_custom_dates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update custom dates"
  ON public.funnel_custom_dates FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete custom dates"
  ON public.funnel_custom_dates FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_funnel_custom_dates_updated_at
  BEFORE UPDATE ON public.funnel_custom_dates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
