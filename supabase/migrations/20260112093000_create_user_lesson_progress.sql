-- Tabela para rastrear progresso do usuario nas aulas
CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_id ON public.user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lesson_id ON public.user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_completed ON public.user_lesson_progress(user_id, completed);

-- RLS
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Politicas: usuario pode ver/editar apenas seu proprio progresso
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_lesson_progress;
CREATE POLICY "Users can view own progress"
  ON public.user_lesson_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_lesson_progress;
CREATE POLICY "Users can insert own progress"
  ON public.user_lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_lesson_progress;
CREATE POLICY "Users can update own progress"
  ON public.user_lesson_progress FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_lesson_progress;
CREATE POLICY "Users can delete own progress"
  ON public.user_lesson_progress FOR DELETE
  USING (auth.uid() = user_id);
