-- Add google_docs_url column to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS google_docs_url TEXT;