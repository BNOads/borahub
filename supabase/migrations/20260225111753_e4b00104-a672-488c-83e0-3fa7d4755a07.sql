
-- Strategic Sessions
CREATE TABLE public.strategic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  google_sheet_url text,
  google_calendar_id text,
  public_slug text UNIQUE,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read sessions" ON public.strategic_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can read sessions by slug" ON public.strategic_sessions FOR SELECT TO anon USING (public_slug IS NOT NULL);
CREATE POLICY "Admin/manager can insert sessions" ON public.strategic_sessions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can update sessions" ON public.strategic_sessions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can delete sessions" ON public.strategic_sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER update_strategic_sessions_updated_at BEFORE UPDATE ON public.strategic_sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Strategic Leads
CREATE TABLE public.strategic_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.strategic_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  stage text NOT NULL DEFAULT 'lead',
  is_qualified boolean NOT NULL DEFAULT false,
  qualification_score numeric,
  qualification_notes text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  meeting_date timestamptz,
  meeting_notes text,
  sale_value numeric,
  assigned_to uuid REFERENCES public.profiles(id),
  extra_data jsonb NOT NULL DEFAULT '{}',
  source_row_id text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read leads" ON public.strategic_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can read leads by session slug" ON public.strategic_leads FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.strategic_sessions WHERE id = session_id AND public_slug IS NOT NULL));
CREATE POLICY "Admin/manager can insert leads" ON public.strategic_leads FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can update leads" ON public.strategic_leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR assigned_to = auth.uid());
CREATE POLICY "Admin/manager can delete leads" ON public.strategic_leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE INDEX idx_strategic_leads_session ON public.strategic_leads(session_id);
CREATE INDEX idx_strategic_leads_stage ON public.strategic_leads(stage);
CREATE INDEX idx_strategic_leads_utm ON public.strategic_leads(utm_source);

CREATE TRIGGER update_strategic_leads_updated_at BEFORE UPDATE ON public.strategic_leads FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Strategic Lead History
CREATE TABLE public.strategic_lead_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.strategic_leads(id) ON DELETE CASCADE,
  previous_stage text,
  new_stage text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id),
  changed_by_name text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_lead_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read history" ON public.strategic_lead_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert history" ON public.strategic_lead_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_strategic_lead_history_lead ON public.strategic_lead_history(lead_id);

-- Strategic Daily Reports
CREATE TABLE public.strategic_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.strategic_sessions(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  report_type text NOT NULL,
  author_id uuid REFERENCES public.profiles(id),
  author_name text NOT NULL,
  contacts int NOT NULL DEFAULT 0,
  followups int NOT NULL DEFAULT 0,
  meetings_scheduled int NOT NULL DEFAULT 0,
  meetings_held int NOT NULL DEFAULT 0,
  no_shows int NOT NULL DEFAULT 0,
  sales int NOT NULL DEFAULT 0,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read reports" ON public.strategic_daily_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can read reports by session slug" ON public.strategic_daily_reports FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.strategic_sessions WHERE id = session_id AND public_slug IS NOT NULL));
CREATE POLICY "Authenticated can insert reports" ON public.strategic_daily_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin/manager can update reports" ON public.strategic_daily_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR author_id = auth.uid());
CREATE POLICY "Admin/manager can delete reports" ON public.strategic_daily_reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE INDEX idx_strategic_daily_reports_session ON public.strategic_daily_reports(session_id);

-- Strategic Links
CREATE TABLE public.strategic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.strategic_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  category text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read links" ON public.strategic_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can read links by session slug" ON public.strategic_links FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.strategic_sessions WHERE id = session_id AND public_slug IS NOT NULL));
CREATE POLICY "Admin/manager can insert links" ON public.strategic_links FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can update links" ON public.strategic_links FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can delete links" ON public.strategic_links FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Strategic Qualification Criteria
CREATE TABLE public.strategic_qualification_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.strategic_sessions(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  operator text NOT NULL,
  value text NOT NULL,
  weight numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_qualification_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read criteria" ON public.strategic_qualification_criteria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can insert criteria" ON public.strategic_qualification_criteria FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can update criteria" ON public.strategic_qualification_criteria FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/manager can delete criteria" ON public.strategic_qualification_criteria FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
