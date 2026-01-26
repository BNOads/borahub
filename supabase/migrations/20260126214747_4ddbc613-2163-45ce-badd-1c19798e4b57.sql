-- Criar tabela de relacionamento entre funis e produtos
CREATE TABLE public.funnel_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(funnel_id, product_id)
);

-- Habilitar RLS
ALTER TABLE public.funnel_products ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para usuários autenticados
CREATE POLICY "Authenticated users can view funnel_products"
  ON public.funnel_products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert funnel_products"
  ON public.funnel_products FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete funnel_products"
  ON public.funnel_products FOR DELETE TO authenticated USING (true);