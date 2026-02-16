-- Fix RLS policy to allow updating legacy tasks (where assigned_to_id and created_by_id are both NULL)
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    (assigned_to_id = auth.uid()) 
    OR (created_by_id = auth.uid())
    OR (assigned_to_id IS NULL AND created_by_id IS NULL)
  )
  WITH CHECK (
    (assigned_to_id = auth.uid()) 
    OR (created_by_id = auth.uid())
    OR (assigned_to_id IS NULL AND created_by_id IS NULL)
  );

-- Also fix delete policy for consistency
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    (assigned_to_id = auth.uid()) 
    OR (created_by_id = auth.uid())
    OR (assigned_to_id IS NULL AND created_by_id IS NULL)
  );