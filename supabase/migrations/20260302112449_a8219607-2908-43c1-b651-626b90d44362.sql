
-- Tabela para armazenar tokens OAuth do Bling
CREATE TABLE public.bling_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bling_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bling tokens"
ON public.bling_oauth_tokens
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tabela principal de envios de livros
CREATE TABLE public.book_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  external_id TEXT,
  product_name TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_document TEXT,
  buyer_address JSONB,
  sale_date TIMESTAMPTZ,
  sale_value NUMERIC(12,2),
  stage TEXT NOT NULL DEFAULT 'venda',
  bling_order_id TEXT,
  tracking_code TEXT,
  label_url TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  bling_created_at TIMESTAMPTZ,
  label_generated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.book_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view book shipments"
ON public.book_shipments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage book shipments"
ON public.book_shipments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_book_shipments_stage ON public.book_shipments(stage);
CREATE INDEX idx_book_shipments_external_id ON public.book_shipments(external_id);
CREATE INDEX idx_book_shipments_sale_date ON public.book_shipments(sale_date);

-- Histórico de movimentações
CREATE TABLE public.book_shipment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES public.book_shipments(id) ON DELETE CASCADE NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.book_shipment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shipment history"
ON public.book_shipment_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert shipment history"
ON public.book_shipment_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tabela de configuração de aliases de livros
CREATE TABLE public.book_product_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.book_product_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view aliases"
ON public.book_product_aliases
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage aliases"
ON public.book_product_aliases
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Inserir aliases padrão
INSERT INTO public.book_product_aliases (alias) VALUES
  ('livro'),
  ('book'),
  ('gdae'),
  ('guia de ação empreendedora'),
  ('guia de acao empreendedora');

-- Triggers de updated_at
CREATE TRIGGER update_bling_oauth_tokens_updated_at
  BEFORE UPDATE ON public.bling_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_book_shipments_updated_at
  BEFORE UPDATE ON public.book_shipments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
