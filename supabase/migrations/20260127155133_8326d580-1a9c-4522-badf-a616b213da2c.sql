-- Create reports table for storing generated reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'custom',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  scope JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,
  content_html TEXT,
  content_markdown TEXT,
  ai_suggestions JSONB DEFAULT '[]'::jsonb,
  generated_by UUID REFERENCES public.profiles(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'generating',
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all reports
CREATE POLICY "Authenticated users can view reports"
ON public.reports
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
ON public.reports
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update their own reports
CREATE POLICY "Users can update their own reports"
ON public.reports
FOR UPDATE
USING (auth.uid() = generated_by);

-- Policy: Users can delete their own reports
CREATE POLICY "Users can delete their own reports"
ON public.reports
FOR DELETE
USING (auth.uid() = generated_by);

-- Create index for faster queries
CREATE INDEX idx_reports_generated_by ON public.reports(generated_by);
CREATE INDEX idx_reports_report_type ON public.reports(report_type);
CREATE INDEX idx_reports_period ON public.reports(period_start, period_end);
CREATE INDEX idx_reports_status ON public.reports(status);

-- Create trigger for updated_at
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();