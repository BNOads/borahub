-- Tabela de produtos com regras de comissão
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de vendas
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE, -- ID Hotmart ou Asaas
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL, -- Snapshot do nome do produto
  total_value NUMERIC(12,2) NOT NULL,
  installments_count INTEGER NOT NULL DEFAULT 1,
  platform TEXT NOT NULL CHECK (platform IN ('hotmart', 'asaas')),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  commission_percent NUMERIC(5,2) NOT NULL,
  sale_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de parcelas
CREATE TABLE public.installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  value NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(sale_id, installment_number)
);

-- Tabela de comissões
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installment_id UUID NOT NULL REFERENCES public.installments(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  installment_value NUMERIC(12,2) NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL,
  commission_value NUMERIC(12,2) NOT NULL,
  competence_month DATE NOT NULL, -- Primeiro dia do mês de competência
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'released', 'suspended', 'cancelled')),
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(installment_id)
);

-- Histórico de importações CSV
CREATE TABLE public.csv_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('hotmart', 'asaas')),
  filename TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_log JSONB,
  imported_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Mapeamento de colunas CSV por usuário/plataforma
CREATE TABLE public.csv_column_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  platform TEXT NOT NULL CHECK (platform IN ('hotmart', 'asaas')),
  mapping JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_column_mappings ENABLE ROW LEVEL SECURITY;

-- Products policies (Admin only can manage, all authenticated can view)
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Sales policies
CREATE POLICY "Sellers can view own sales" ON public.sales
  FOR SELECT USING (
    seller_id = auth.uid() OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Finance and Admin can create sales" ON public.sales
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Finance and Admin can update sales" ON public.sales
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager')
  );

-- Installments policies
CREATE POLICY "Users can view installments of their sales" ON public.installments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales s 
      WHERE s.id = installments.sale_id 
      AND (s.seller_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
    )
  );

CREATE POLICY "Finance and Admin can manage installments" ON public.installments
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager')
  );

-- Commissions policies
CREATE POLICY "Sellers can view own commissions" ON public.commissions
  FOR SELECT USING (
    seller_id = auth.uid() OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Finance and Admin can manage commissions" ON public.commissions
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager')
  );

-- CSV imports policies
CREATE POLICY "Finance and Admin can view imports" ON public.csv_imports
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Finance and Admin can create imports" ON public.csv_imports
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager')
  );

-- CSV column mappings policies
CREATE POLICY "Users can manage own mappings" ON public.csv_column_mappings
  FOR ALL USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_installments_updated_at BEFORE UPDATE ON public.installments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_csv_column_mappings_updated_at BEFORE UPDATE ON public.csv_column_mappings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();