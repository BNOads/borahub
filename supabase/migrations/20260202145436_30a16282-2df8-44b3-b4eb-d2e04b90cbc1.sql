-- Create mentoria_documentos table
CREATE TABLE public.mentoria_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID REFERENCES public.mentoria_processos(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Novo Documento',
  content TEXT DEFAULT '',
  icon TEXT DEFAULT '📄',
  google_docs_url TEXT,
  is_favorite BOOLEAN DEFAULT false,
  category TEXT,
  slug TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create trigger for updated_at
CREATE TRIGGER update_mentoria_documentos_updated_at
BEFORE UPDATE ON public.mentoria_documentos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create function to generate slug
CREATE OR REPLACE FUNCTION public.generate_mentoria_doc_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto-generating slug
CREATE TRIGGER mentoria_documentos_generate_slug
BEFORE INSERT ON public.mentoria_documentos
FOR EACH ROW
EXECUTE FUNCTION public.generate_mentoria_doc_slug();

-- Enable RLS
ALTER TABLE public.mentoria_documentos ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view mentoria documents"
ON public.mentoria_documentos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create mentoria documents"
ON public.mentoria_documentos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update mentoria documents"
ON public.mentoria_documentos FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete mentoria documents"
ON public.mentoria_documentos FOR DELETE
TO authenticated
USING (true);

-- Create mentoria_document_folders table for organizing folders
CREATE TABLE public.mentoria_document_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.mentoria_document_folders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view mentoria folders"
ON public.mentoria_document_folders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create mentoria folders"
ON public.mentoria_document_folders FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update mentoria folders"
ON public.mentoria_document_folders FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete mentoria folders"
ON public.mentoria_document_folders FOR DELETE
TO authenticated
USING (true);