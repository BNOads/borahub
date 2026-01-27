-- Create table for report folders
CREATE TABLE public.report_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for report_folders
CREATE POLICY "Authenticated users can view report folders"
ON public.report_folders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create report folders"
ON public.report_folders FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update report folders"
ON public.report_folders FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete report folders"
ON public.report_folders FOR DELETE
TO authenticated
USING (true);

-- Add folder_id to reports table
ALTER TABLE public.reports ADD COLUMN folder_id UUID REFERENCES public.report_folders(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_reports_folder_id ON public.reports(folder_id);
CREATE INDEX idx_report_folders_created_by ON public.report_folders(created_by);

-- Trigger for updated_at
CREATE TRIGGER update_report_folders_updated_at
BEFORE UPDATE ON public.report_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();