-- Adicionar colunas para armazenar dados da tarefa no checklist
ALTER TABLE public.funnel_checklist
ADD COLUMN IF NOT EXISTS linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_to TEXT,
ADD COLUMN IF NOT EXISTS task_due_date DATE;

-- Índice para buscar itens com tarefa vinculada
CREATE INDEX IF NOT EXISTS idx_funnel_checklist_linked_task ON public.funnel_checklist(linked_task_id) WHERE linked_task_id IS NOT NULL;