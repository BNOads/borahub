-- Add price column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;