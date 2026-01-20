-- Add proof_link column to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS proof_link TEXT;