-- Adicionar campos de recorrencia na tabela tasks

-- Tipo de recorrencia
CREATE TYPE recurrence_type AS ENUM (
  'none',      -- Sem recorrencia
  'daily',     -- Diario
  'weekly',    -- Semanal
  'biweekly',  -- Quinzenal
  'monthly',   -- Mensal
  'semiannual',-- Semestral
  'yearly'     -- Anual
);

-- Adicionar colunas de recorrencia
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS recurrence recurrence_type DEFAULT 'none',
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,           -- Data final da recorrencia (opcional)
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Referencia a tarefa pai (para tarefas geradas)
ADD COLUMN IF NOT EXISTS is_recurring_instance BOOLEAN DEFAULT false; -- Se e uma instancia gerada de tarefa recorrente

-- Indice para buscar tarefas recorrentes
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence) WHERE recurrence != 'none';
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Funcao para gerar proxima data baseada na recorrencia
CREATE OR REPLACE FUNCTION get_next_recurrence_date(
  base_date DATE,
  rec_type recurrence_type
) RETURNS DATE AS $$
BEGIN
  CASE rec_type
    WHEN 'daily' THEN RETURN base_date + INTERVAL '1 day';
    WHEN 'weekly' THEN RETURN base_date + INTERVAL '1 week';
    WHEN 'biweekly' THEN RETURN base_date + INTERVAL '2 weeks';
    WHEN 'monthly' THEN RETURN base_date + INTERVAL '1 month';
    WHEN 'semiannual' THEN RETURN base_date + INTERVAL '6 months';
    WHEN 'yearly' THEN RETURN base_date + INTERVAL '1 year';
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funcao para criar proxima instancia de tarefa recorrente
CREATE OR REPLACE FUNCTION create_next_recurring_task(task_id UUID)
RETURNS UUID AS $$
DECLARE
  original_task RECORD;
  next_date DATE;
  new_task_id UUID;
BEGIN
  -- Buscar tarefa original
  SELECT * INTO original_task FROM tasks WHERE id = task_id;

  IF original_task IS NULL OR original_task.recurrence = 'none' THEN
    RETURN NULL;
  END IF;

  -- Calcular proxima data
  next_date := get_next_recurrence_date(original_task.due_date, original_task.recurrence);

  -- Verificar se passou da data limite
  IF original_task.recurrence_end_date IS NOT NULL AND next_date > original_task.recurrence_end_date THEN
    RETURN NULL;
  END IF;

  -- Criar nova tarefa
  INSERT INTO tasks (
    title,
    description,
    priority,
    category,
    assignee,
    assigned_to_id,
    due_date,
    due_time,
    recurrence,
    recurrence_end_date,
    parent_task_id,
    is_recurring_instance,
    position
  ) VALUES (
    original_task.title,
    original_task.description,
    original_task.priority,
    original_task.category,
    original_task.assignee,
    original_task.assigned_to_id,
    next_date,
    original_task.due_time,
    original_task.recurrence,
    original_task.recurrence_end_date,
    COALESCE(original_task.parent_task_id, original_task.id), -- Manter referencia ao pai original
    true,
    original_task.position
  ) RETURNING id INTO new_task_id;

  RETURN new_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar proxima tarefa quando uma recorrente e concluida
CREATE OR REPLACE FUNCTION handle_recurring_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a tarefa foi marcada como concluida e tem recorrencia
  IF NEW.completed = true AND OLD.completed = false AND NEW.recurrence != 'none' THEN
    PERFORM create_next_recurring_task(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS on_recurring_task_completed ON tasks;
CREATE TRIGGER on_recurring_task_completed
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.completed = true AND OLD.completed = false)
  EXECUTE FUNCTION handle_recurring_task_completion();
