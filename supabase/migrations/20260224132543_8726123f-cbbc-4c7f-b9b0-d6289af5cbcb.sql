
-- Drop existing subtask policies
DROP POLICY IF EXISTS "Users can manage subtasks of own tasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can update subtasks of own tasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can delete subtasks of own tasks" ON public.subtasks;

-- Recreate with admin/manager and legacy support
CREATE POLICY "Users can manage subtasks of own tasks" ON public.subtasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = subtasks.task_id
    AND (
      t.assigned_to_id = auth.uid()
      OR t.created_by_id = auth.uid()
      OR (t.assigned_to_id IS NULL AND t.created_by_id IS NULL)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
);

CREATE POLICY "Users can update subtasks of own tasks" ON public.subtasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = subtasks.task_id
    AND (
      t.assigned_to_id = auth.uid()
      OR t.created_by_id = auth.uid()
      OR (t.assigned_to_id IS NULL AND t.created_by_id IS NULL)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
);

CREATE POLICY "Users can delete subtasks of own tasks" ON public.subtasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = subtasks.task_id
    AND (
      t.assigned_to_id = auth.uid()
      OR t.created_by_id = auth.uid()
      OR (t.assigned_to_id IS NULL AND t.created_by_id IS NULL)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
);
