-- Add Facebook Pixel and conversion event columns to quizzes table
ALTER TABLE public.quizzes
ADD COLUMN pixel_id text,
ADD COLUMN pixel_event_start text,
ADD COLUMN pixel_event_complete text;

-- Add comments for documentation
COMMENT ON COLUMN public.quizzes.pixel_id IS 'Facebook Pixel ID for tracking';
COMMENT ON COLUMN public.quizzes.pixel_event_start IS 'Conversion event name to fire when quiz starts';
COMMENT ON COLUMN public.quizzes.pixel_event_complete IS 'Conversion event name to fire when quiz completes';