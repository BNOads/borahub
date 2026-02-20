
-- Atualizar política DELETE de tasks para permitir que qualquer usuário apague suas próprias tarefas
-- incluindo tarefas onde o assignee bate com o email/nome do perfil do usuário

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Users can delete own tasks"
ON public.tasks
FOR DELETE
USING (
  assigned_to_id = auth.uid()
  OR created_by_id = auth.uid()
  OR (assigned_to_id IS NULL AND created_by_id IS NULL)
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.full_name = tasks.assignee
  )
);
