
-- OKR Cycles
CREATE TABLE public.okr_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.okr_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cycles" ON public.okr_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can insert cycles" ON public.okr_cycles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can update cycles" ON public.okr_cycles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can delete cycles" ON public.okr_cycles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER update_okr_cycles_updated_at BEFORE UPDATE ON public.okr_cycles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- OKR Objectives
CREATE TABLE public.okr_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.okr_cycles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#3b82f6',
  owner_id uuid REFERENCES public.profiles(id),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.okr_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view objectives" ON public.okr_objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can insert objectives" ON public.okr_objectives FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can update objectives" ON public.okr_objectives FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can delete objectives" ON public.okr_objectives FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER update_okr_objectives_updated_at BEFORE UPDATE ON public.okr_objectives FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- OKR Key Results
CREATE TABLE public.okr_key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES public.okr_objectives(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_value numeric NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  unit text,
  owner_id uuid REFERENCES public.profiles(id),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.okr_key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view key results" ON public.okr_key_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can insert key results" ON public.okr_key_results FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can update key results" ON public.okr_key_results FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can delete key results" ON public.okr_key_results FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER update_okr_key_results_updated_at BEFORE UPDATE ON public.okr_key_results FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
