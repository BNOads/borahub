-- Add columns to track task ownership
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all" ON public.tasks;

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT all tasks (visibility is global)
CREATE POLICY "Users can view all tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can INSERT tasks (creating their own tasks)
CREATE POLICY "Users can create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can UPDATE only their own tasks (assigned_to_id = current user OR created_by_id = current user)
CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (assigned_to_id = auth.uid() OR created_by_id = auth.uid())
  WITH CHECK (assigned_to_id = auth.uid() OR created_by_id = auth.uid());

-- Policy: Users can DELETE only their own tasks (assigned_to_id = current user OR created_by_id = current user)
CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (assigned_to_id = auth.uid() OR created_by_id = auth.uid());

-- Also update subtasks, task_comments, and task_history policies for consistency
DROP POLICY IF EXISTS "Allow all" ON public.subtasks;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subtasks"
  ON public.subtasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage subtasks of own tasks"
  ON public.subtasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (t.assigned_to_id = auth.uid() OR t.created_by_id = auth.uid())
    )
  );

CREATE POLICY "Users can update subtasks of own tasks"
  ON public.subtasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (t.assigned_to_id = auth.uid() OR t.created_by_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete subtasks of own tasks"
  ON public.subtasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (t.assigned_to_id = auth.uid() OR t.created_by_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Allow all" ON public.task_comments;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task comments"
  ON public.task_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can comment on accessible tasks"
  ON public.task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (t.assigned_to_id = auth.uid() OR t.created_by_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own comments"
  ON public.task_comments FOR DELETE
  TO authenticated
  USING (author_name = (SELECT email FROM auth.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow all" ON public.task_history;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task history"
  ON public.task_history FOR SELECT
  TO authenticated
  USING (true);