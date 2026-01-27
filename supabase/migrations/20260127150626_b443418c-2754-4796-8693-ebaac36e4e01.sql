-- Create table to associate events with funnels
CREATE TABLE public.funnel_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(funnel_id, event_id)
);

-- Enable RLS
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view funnel events"
ON public.funnel_events
FOR SELECT
USING (true);

CREATE POLICY "Users can create funnel events"
ON public.funnel_events
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete funnel events"
ON public.funnel_events
FOR DELETE
USING (true);

-- Create index for better query performance
CREATE INDEX idx_funnel_events_funnel_id ON public.funnel_events(funnel_id);
CREATE INDEX idx_funnel_events_event_id ON public.funnel_events(event_id);