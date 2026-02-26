
-- Tabela de auditoria para vendas
CREATE TABLE public.sales_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID
);

-- Index para consultas por sale_id e data
CREATE INDEX idx_sales_audit_sale_id ON public.sales_audit_log(sale_id);
CREATE INDEX idx_sales_audit_changed_at ON public.sales_audit_log(changed_at DESC);

-- RLS
ALTER TABLE public.sales_audit_log ENABLE ROW LEVEL SECURITY;

-- Somente admins podem ver o audit log
CREATE POLICY "Admins can view audit log"
  ON public.sales_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Ninguém pode inserir/deletar manualmente (só o trigger)
CREATE POLICY "System insert only"
  ON public.sales_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Trigger function
CREATE OR REPLACE FUNCTION public.log_sales_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.sales_audit_log (sale_id, operation, new_data, changed_by)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.sales_audit_log (sale_id, operation, old_data, new_data, changed_by)
    VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.sales_audit_log (sale_id, operation, old_data, changed_by)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger na tabela sales
CREATE TRIGGER sales_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sales_changes();
