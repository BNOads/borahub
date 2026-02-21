-- Add optional instagram field to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS cliente_instagram text;

-- Create table for custom ticket origins (admin-managed)
CREATE TABLE public.ticket_origens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT '📋',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_origens ENABLE ROW LEVEL SECURITY;

-- Everyone can read origins
CREATE POLICY "Authenticated users can view ticket origins"
  ON public.ticket_origens FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can manage origins
CREATE POLICY "Admins can manage ticket origins"
  ON public.ticket_origens FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Seed default origins
INSERT INTO public.ticket_origens (value, icon) VALUES
  ('WhatsApp', '💬'),
  ('Email', '📧'),
  ('Telefone', '📞'),
  ('Site', '🌐'),
  ('Chat', '💭'),
  ('Outro', '📋')
ON CONFLICT (value) DO NOTHING;