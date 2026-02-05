-- Adicionar coluna responsible_user_id na tabela funnels
ALTER TABLE public.funnels 
ADD COLUMN responsible_user_id uuid REFERENCES public.profiles(id);

-- Criar tabela funnel_daily_reports
CREATE TABLE public.funnel_daily_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  contacts integer NOT NULL DEFAULT 0,
  followups integer NOT NULL DEFAULT 0,
  reschedules integer NOT NULL DEFAULT 0,
  meetings_scheduled integer NOT NULL DEFAULT 0,
  meetings_held integer NOT NULL DEFAULT 0,
  no_shows integer NOT NULL DEFAULT 0,
  sales integer NOT NULL DEFAULT 0,
  summary text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(funnel_id, report_date)
);

-- Enable RLS
ALTER TABLE public.funnel_daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies para funnel_daily_reports
CREATE POLICY "Users can view all daily reports"
ON public.funnel_daily_reports
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own daily reports"
ON public.funnel_daily_reports
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own daily reports"
ON public.funnel_daily_reports
FOR UPDATE
USING (auth.uid() = created_by);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.funnel_daily_reports;