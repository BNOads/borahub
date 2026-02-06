
-- Tabela para categorias de gasto personalizadas por funil
CREATE TABLE public.funnel_budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  percent NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT 'bg-gray-500',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funnel_budget_categories ENABLE ROW LEVEL SECURITY;

-- Policies - authenticated users can manage
CREATE POLICY "Authenticated users can view budget categories"
  ON public.funnel_budget_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert budget categories"
  ON public.funnel_budget_categories FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update budget categories"
  ON public.funnel_budget_categories FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete budget categories"
  ON public.funnel_budget_categories FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_funnel_budget_categories_updated_at
  BEFORE UPDATE ON public.funnel_budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
