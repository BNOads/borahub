
CREATE TABLE public.strategic_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.strategic_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL DEFAULT '09:00',
  duration_minutes INT DEFAULT 30,
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.strategic_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage strategic meetings"
  ON public.strategic_meetings FOR ALL TO authenticated USING (true) WITH CHECK (true);
