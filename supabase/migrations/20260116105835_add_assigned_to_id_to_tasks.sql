-- Adicionar campo assigned_to_id para relacionar tarefas com usuarios
-- Mantemos o campo assignee (VARCHAR) para compatibilidade com dados existentes

-- Adicionar coluna assigned_to_id
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Criar indice para busca por usuario
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON tasks(assigned_to_id);

-- Atualizar assigned_to_id baseado no campo assignee existente (se possivel)
-- Isso tenta fazer match pelo nome completo
UPDATE tasks t
SET assigned_to_id = p.id
FROM profiles p
WHERE t.assigned_to_id IS NULL
  AND t.assignee IS NOT NULL
  AND (
    LOWER(p.full_name) = LOWER(t.assignee)
    OR LOWER(p.display_name) = LOWER(t.assignee)
  );
