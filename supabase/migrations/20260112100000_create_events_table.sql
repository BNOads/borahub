-- Tabela de eventos/agenda
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  meeting_link TEXT,
  event_type TEXT DEFAULT 'meeting', -- meeting, one-on-one, deadline, reminder
  color TEXT DEFAULT '#D4AF37',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Politicas: todos usuarios autenticados podem ver e gerenciar eventos
DROP POLICY IF EXISTS "Users can view all events" ON public.events;
CREATE POLICY "Users can view all events"
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create events" ON public.events;
CREATE POLICY "Users can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update events" ON public.events;
CREATE POLICY "Users can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can delete events" ON public.events;
CREATE POLICY "Users can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (true);
