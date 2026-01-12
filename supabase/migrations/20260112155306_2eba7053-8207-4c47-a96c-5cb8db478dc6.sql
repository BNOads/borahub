-- Add missing columns to links table
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  icon TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  slug TEXT UNIQUE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_documents_slug ON public.documents(slug);
CREATE INDEX idx_documents_category ON public.documents(category);
CREATE INDEX idx_documents_public ON public.documents(is_public);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Permissive policies
CREATE POLICY "Allow all on documents" ON public.documents FOR ALL USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();