
ALTER TABLE public.strategic_sessions 
ADD COLUMN custom_stages jsonb DEFAULT NULL;

COMMENT ON COLUMN public.strategic_sessions.custom_stages IS 'Array of {key, label, color} objects defining custom Kanban stages. NULL means use defaults.';
