
-- Add participants column to events table
ALTER TABLE public.events ADD COLUMN participants text[] DEFAULT '{}';
