-- Adicionar coluna para URL de vídeo nos posts
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Comentário para documentar
COMMENT ON COLUMN public.social_posts.video_url IS 'URL de vídeo do Google Drive ou YouTube para embed no post';