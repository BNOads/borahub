-- Adicionar campos de recorrencia na tabela events

-- Adicionar colunas de recorrencia
ALTER TABLE events
ADD COLUMN IF NOT EXISTS recurrence recurrence_type DEFAULT 'none',
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_recurring_instance BOOLEAN DEFAULT false;

-- Indices para buscar eventos recorrentes
CREATE INDEX IF NOT EXISTS idx_events_recurrence ON events(recurrence) WHERE recurrence != 'none';
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON events(parent_event_id);

-- Funcao para criar proxima instancia de evento recorrente
CREATE OR REPLACE FUNCTION create_next_recurring_event(event_id UUID)
RETURNS UUID AS $$
DECLARE
  original_event RECORD;
  next_date DATE;
  new_event_id UUID;
BEGIN
  -- Buscar evento original
  SELECT * INTO original_event FROM events WHERE id = event_id;

  IF original_event IS NULL OR original_event.recurrence = 'none' THEN
    RETURN NULL;
  END IF;

  -- Calcular proxima data usando a funcao existente
  next_date := get_next_recurrence_date(original_event.event_date, original_event.recurrence);

  -- Verificar se passou da data limite
  IF original_event.recurrence_end_date IS NOT NULL AND next_date > original_event.recurrence_end_date THEN
    RETURN NULL;
  END IF;

  -- Criar novo evento
  INSERT INTO events (
    title,
    description,
    event_date,
    event_time,
    duration_minutes,
    location,
    meeting_link,
    event_type,
    color,
    created_by,
    recurrence,
    recurrence_end_date,
    parent_event_id,
    is_recurring_instance
  ) VALUES (
    original_event.title,
    original_event.description,
    next_date,
    original_event.event_time,
    original_event.duration_minutes,
    original_event.location,
    original_event.meeting_link,
    original_event.event_type,
    original_event.color,
    original_event.created_by,
    original_event.recurrence,
    original_event.recurrence_end_date,
    COALESCE(original_event.parent_event_id, original_event.id),
    true
  ) RETURNING id INTO new_event_id;

  RETURN new_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
