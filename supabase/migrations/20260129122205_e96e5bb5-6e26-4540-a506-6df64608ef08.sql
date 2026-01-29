-- Create user_notes table for personal quick notes
CREATE TABLE public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Each user has only one note (unique notepad)
CREATE UNIQUE INDEX user_notes_user_id_unique ON public.user_notes(user_id);

-- Enable RLS
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- Policy: users can only manage their own notes
CREATE POLICY "Users can view own notes"
  ON public.user_notes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notes"
  ON public.user_notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notes"
  ON public.user_notes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notes"
  ON public.user_notes FOR DELETE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_user_notes_updated_at
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();