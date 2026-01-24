-- Add result page customization fields to quizzes table
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS result_title TEXT DEFAULT 'Seu Diagnóstico Personalizado',
ADD COLUMN IF NOT EXISTS result_subtitle TEXT,
ADD COLUMN IF NOT EXISTS result_image_url TEXT,
ADD COLUMN IF NOT EXISTS result_video_url TEXT,
ADD COLUMN IF NOT EXISTS result_layout TEXT DEFAULT 'standard';