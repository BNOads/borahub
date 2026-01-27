-- Create storage bucket for report attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-attachments', 'report-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for report attachments bucket
CREATE POLICY "Authenticated users can upload report attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-attachments');

CREATE POLICY "Authenticated users can view report attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'report-attachments');

CREATE POLICY "Authenticated users can delete their report attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'report-attachments');

-- Create table for report attachments
CREATE TABLE public.report_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for report_attachments
CREATE POLICY "Authenticated users can view report attachments"
ON public.report_attachments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert report attachments"
ON public.report_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete report attachments"
ON public.report_attachments FOR DELETE
TO authenticated
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_report_attachments_report_id ON public.report_attachments(report_id);