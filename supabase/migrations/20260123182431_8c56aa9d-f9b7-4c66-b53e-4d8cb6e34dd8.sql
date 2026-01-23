-- Add parent_subtask_id column to allow nested subtasks
ALTER TABLE public.subtasks 
ADD COLUMN parent_subtask_id uuid REFERENCES public.subtasks(id) ON DELETE CASCADE;

-- Create index for faster queries on nested subtasks
CREATE INDEX idx_subtasks_parent_subtask_id ON public.subtasks(parent_subtask_id);