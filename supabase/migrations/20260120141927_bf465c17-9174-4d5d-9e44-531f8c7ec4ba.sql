-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create table to track automated sync results
CREATE TABLE IF NOT EXISTS public.hotmart_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'sales', 'products', 'installments', 'scheduled'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error'
  total_records INTEGER DEFAULT 0,
  created_records INTEGER DEFAULT 0,
  updated_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hotmart_sync_logs ENABLE ROW LEVEL SECURITY;

-- Admin and financial can view sync logs
CREATE POLICY "Admins can view sync logs" 
ON public.hotmart_sync_logs 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  EXISTS (
    SELECT 1 FROM profiles p 
    JOIN departments d ON p.department_id = d.id 
    WHERE p.id = auth.uid() AND d.name = 'Financeiro'
  )
);

-- Create index for faster queries
CREATE INDEX idx_hotmart_sync_logs_started_at ON public.hotmart_sync_logs(started_at DESC);
CREATE INDEX idx_hotmart_sync_logs_status ON public.hotmart_sync_logs(status);