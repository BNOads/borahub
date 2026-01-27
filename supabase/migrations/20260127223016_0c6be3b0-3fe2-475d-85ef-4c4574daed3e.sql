-- Criar bucket para uploads de video/audio
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('video-uploads', 'video-uploads', false, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Politica para upload (usuarios autenticados podem fazer upload na pasta do proprio user)
CREATE POLICY "Users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Politica para visualizar proprios uploads
CREATE POLICY "Users can view their uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Politica para deletar proprios uploads
CREATE POLICY "Users can delete their uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Criar tabela de transcricoes
CREATE TABLE public.transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'post', 'lesson')),
  source_id TEXT,
  original_file_path TEXT,
  original_file_name TEXT,
  duration_seconds INTEGER,
  language TEXT DEFAULT 'pt',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  speakers_count INTEGER,
  transcript_text TEXT,
  transcript_segments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

-- Usuarios podem ver suas proprias transcricoes
CREATE POLICY "Users can view own transcriptions"
ON public.transcriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Usuarios podem inserir suas proprias transcricoes
CREATE POLICY "Users can insert own transcriptions"
ON public.transcriptions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Usuarios podem atualizar suas proprias transcricoes
CREATE POLICY "Users can update own transcriptions"
ON public.transcriptions FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Usuarios podem deletar suas proprias transcricoes
CREATE POLICY "Users can delete own transcriptions"
ON public.transcriptions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Admins podem ver todas as transcricoes
CREATE POLICY "Admins can view all transcriptions"
ON public.transcriptions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_transcriptions_updated_at
BEFORE UPDATE ON public.transcriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();