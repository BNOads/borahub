-- Add recurrence columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS recurrence character varying DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_end_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_recurring_instance boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS assigned_to_id uuid DEFAULT NULL;

-- Create index for faster recurrence queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON public.tasks(recurrence) WHERE recurrence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;