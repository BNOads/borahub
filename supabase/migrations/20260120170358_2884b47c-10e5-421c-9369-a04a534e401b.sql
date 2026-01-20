-- Add payment_type column to sales table
ALTER TABLE public.sales 
ADD COLUMN payment_type TEXT;