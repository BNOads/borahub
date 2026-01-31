-- Create copy_bank table for storing generated copies
CREATE TABLE public.copy_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id),
  author_name TEXT NOT NULL,
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
  funnel_name TEXT,
  product_name TEXT,
  funnel_stage TEXT,
  channel TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  content TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.copy_bank ENABLE ROW LEVEL SECURITY;

-- Create policies - all authenticated users can view
CREATE POLICY "Authenticated users can view all copies"
ON public.copy_bank FOR SELECT
TO authenticated
USING (true);

-- Users can create their own copies
CREATE POLICY "Authenticated users can create copies"
ON public.copy_bank FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Users can update their own copies
CREATE POLICY "Users can update their own copies"
ON public.copy_bank FOR UPDATE
TO authenticated
USING (auth.uid() = author_id);

-- Users can delete their own copies
CREATE POLICY "Users can delete their own copies"
ON public.copy_bank FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

-- Create trigger for updated_at
CREATE TRIGGER update_copy_bank_updated_at
BEFORE UPDATE ON public.copy_bank
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for common queries
CREATE INDEX idx_copy_bank_funnel_id ON public.copy_bank(funnel_id);
CREATE INDEX idx_copy_bank_channel ON public.copy_bank(channel);
CREATE INDEX idx_copy_bank_author_id ON public.copy_bank(author_id);
CREATE INDEX idx_copy_bank_created_at ON public.copy_bank(created_at DESC);