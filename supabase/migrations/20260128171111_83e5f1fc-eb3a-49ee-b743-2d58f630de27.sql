-- Add field to track when a task is being actively worked on
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS doing_since TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for quick filtering of active tasks
CREATE INDEX IF NOT EXISTS idx_tasks_doing_since ON public.tasks(doing_since) WHERE doing_since IS NOT NULL;