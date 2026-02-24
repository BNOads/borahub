-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;

-- Create new update policy that also allows admins and managers
CREATE POLICY "Users can update own tasks" ON public.tasks
FOR UPDATE
USING (
  assigned_to_id = auth.uid()
  OR created_by_id = auth.uid()
  OR (assigned_to_id IS NULL AND created_by_id IS NULL)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  assigned_to_id = auth.uid()
  OR created_by_id = auth.uid()
  OR (assigned_to_id IS NULL AND created_by_id IS NULL)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);