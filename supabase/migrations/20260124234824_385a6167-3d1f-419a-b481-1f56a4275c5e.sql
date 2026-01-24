-- Add video_url column to quiz_questions for video support
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add new question types for content blocks (not actual questions)
-- These will be: 'content', 'testimonial', 'divider'
-- The existing question_type column already supports text values, we just need to use new values

-- Add content block specific columns
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS content_title TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS content_body TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS content_author_name TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS content_author_role TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS content_author_image TEXT;

-- Add index for better performance on position ordering
CREATE INDEX IF NOT EXISTS idx_quiz_questions_position ON public.quiz_questions(quiz_id, position);