-- Tabela principal de patrocinadores
CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  additional_info TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  segment TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'possiveis_patrocinadores',
  last_contact_date DATE,
  last_contact_notes TEXT,
  next_action TEXT,
  next_followup_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Eventos de patrocínio (campanhas/eventos específicos)
CREATE TABLE public.sponsor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vínculo N:N entre patrocinadores e eventos
CREATE TABLE public.sponsor_event_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.sponsor_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sponsor_id, event_id)
);

-- Histórico de movimentações do Kanban
CREATE TABLE public.sponsor_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  previous_stage TEXT,
  new_stage TEXT NOT NULL,
  changed_by UUID,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_event_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_stage_history ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_sponsors_updated_at
  BEFORE UPDATE ON public.sponsors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sponsor_events_updated_at
  BEFORE UPDATE ON public.sponsor_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for sponsors
CREATE POLICY "Allow select on sponsors" ON public.sponsors
  FOR SELECT USING (true);

CREATE POLICY "Allow insert on sponsors" ON public.sponsors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on sponsors" ON public.sponsors
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Admins can delete sponsors" ON public.sponsors
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sponsor_events
CREATE POLICY "Allow select on sponsor_events" ON public.sponsor_events
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage sponsor_events" ON public.sponsor_events
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Allow insert on sponsor_events for all" ON public.sponsor_events
  FOR INSERT WITH CHECK (true);

-- RLS Policies for sponsor_event_links
CREATE POLICY "Allow all on sponsor_event_links" ON public.sponsor_event_links
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for sponsor_stage_history
CREATE POLICY "Allow all on sponsor_stage_history" ON public.sponsor_stage_history
  FOR ALL USING (true) WITH CHECK (true);