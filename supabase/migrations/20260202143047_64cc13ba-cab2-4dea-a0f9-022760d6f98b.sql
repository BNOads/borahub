-- Create table for document folders in the Guia de Sobrevivência
CREATE TABLE public.document_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view folders
CREATE POLICY "Authenticated users can view document folders"
ON public.document_folders
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can create/update/delete folders (we'll check admin status in the app)
CREATE POLICY "Authenticated users can insert document folders"
ON public.document_folders
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update document folders"
ON public.document_folders
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete document folders"
ON public.document_folders
FOR DELETE
USING (auth.uid() IS NOT NULL);