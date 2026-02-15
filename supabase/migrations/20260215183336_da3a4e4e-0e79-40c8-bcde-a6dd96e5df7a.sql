
CREATE TABLE public.direct_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  target_url TEXT NOT NULL,
  utm_history_id UUID REFERENCES public.utm_history(id),
  created_by UUID REFERENCES auth.users(id),
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.direct_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view direct_links"
ON public.direct_links FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create direct_links"
ON public.direct_links FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update direct_links"
ON public.direct_links FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can read direct_links by slug"
ON public.direct_links FOR SELECT
USING (true);
