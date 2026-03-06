

## Plano: Reuniões Manuais de Sessão Estratégica (separadas da Agenda)

### Problema

O botão "+" no card de Reuniões abre o modal genérico de eventos da Agenda (`EventModal`), que não tem relação com a sessão estratégica. O correto é permitir criar reuniões vinculadas à sessão estratégica.

### Solução

1. **Nova tabela `strategic_meetings`** para armazenar reuniões manuais vinculadas a uma sessão estratégica
2. **Novo modal simplificado** com apenas os campos relevantes (título, data, horário, duração, link)
3. **Atualizar DashboardTab** para usar a nova tabela ao invés de `events`

### Mudanças

#### 1. Migração — `strategic_meetings`

```sql
CREATE TABLE public.strategic_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.strategic_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL DEFAULT '09:00',
  duration_minutes INT DEFAULT 30,
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.strategic_meetings ENABLE ROW LEVEL SECURITY;
-- RLS: authenticated users can CRUD
CREATE POLICY "Authenticated users manage strategic meetings"
  ON public.strategic_meetings FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

#### 2. Novo componente — `src/components/strategic/CreateMeetingModal.tsx`

Modal simples com campos:
- Título (obrigatório)
- Data (obrigatório)
- Horário (obrigatório)
- Duração em minutos (padrão 30)
- Link da reunião (opcional)
- Notas (opcional)

Recebe `sessionId` como prop e insere na tabela `strategic_meetings`.

#### 3. Hook em `useStrategicSession.ts`

Adicionar:
- `useStrategicMeetings(sessionId)` — query para buscar reuniões da sessão
- `useCreateStrategicMeeting()` — mutation para criar

#### 4. Atualizar `DashboardTab.tsx`

- Remover import de `useEvents` e `EventModal`
- Importar `useStrategicMeetings` e `CreateMeetingModal`
- No `filteredEvents`, substituir `localEvents` por dados de `strategic_meetings`
- Passar `session.id` ao modal de criação
- Source "manual" agora vem de `strategic_meetings`

