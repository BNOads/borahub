-- Create SDR assignments table
CREATE TABLE public.sdr_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  sdr_id UUID NOT NULL REFERENCES public.profiles(id),
  proof_link TEXT NOT NULL,
  commission_percent NUMERIC NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sale_id)
);

-- Create SDR commissions table
CREATE TABLE public.sdr_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sdr_assignment_id UUID NOT NULL REFERENCES public.sdr_assignments(id) ON DELETE CASCADE,
  installment_id UUID NOT NULL REFERENCES public.installments(id) ON DELETE CASCADE,
  sdr_id UUID NOT NULL REFERENCES public.profiles(id),
  installment_value NUMERIC NOT NULL,
  commission_percent NUMERIC NOT NULL DEFAULT 1,
  commission_value NUMERIC NOT NULL,
  competence_month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(installment_id)
);

-- Add triggers for updated_at
CREATE TRIGGER update_sdr_assignments_updated_at
  BEFORE UPDATE ON public.sdr_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sdr_commissions_updated_at
  BEFORE UPDATE ON public.sdr_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.sdr_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sdr_assignments
CREATE POLICY "Users can view SDR assignments" 
  ON public.sdr_assignments 
  FOR SELECT 
  USING (true);

CREATE POLICY "Finance and Admin can manage SDR assignments" 
  ON public.sdr_assignments 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for sdr_commissions
CREATE POLICY "SDRs can view own commissions" 
  ON public.sdr_commissions 
  FOR SELECT 
  USING ((sdr_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Finance and Admin can manage SDR commissions" 
  ON public.sdr_commissions 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));