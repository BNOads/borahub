

## Plano: Sincronização bidirecional Agenda ↔ Google Calendar via Service Account

### Contexto atual
- Já existe uma Service Account configurada (`GOOGLE_SERVICE_ACCOUNT_KEY` secret) com escopo `calendar.readonly`
- Já existe edge function `fetch-google-calendar-events` que **lê** eventos do Google Calendar
- A tabela `events` tem campos: title, description, event_date, event_time, duration_minutes, location, meeting_link, participants, etc.
- Participantes são armazenados como array de nomes (text[]), e profiles tem email associado
- Não há coluna para armazenar o `google_calendar_event_id` (necessário para evitar duplicatas)

### O que será implementado

#### 1. Migração: adicionar coluna de controle na tabela events
- Adicionar `google_calendar_id TEXT` na tabela `events` para guardar o ID do evento no Google Calendar
- Adicionar `google_calendar_source TEXT` para guardar qual calendar_id originou o evento (para sync reverso)

#### 2. Edge Function: `sync-google-calendar` (nova)
Função principal que faz a sincronização bidirecional:

**Push (Sistema → Google Calendar):**
- Recebe dados do evento do sistema
- Cria evento no Google Calendar via API (escopo `calendar` ao invés de `calendar.readonly`)
- Converte nomes de participantes em emails consultando a tabela `profiles`
- Adiciona participantes como `attendees` no Google Calendar (gera convites automáticos)
- Salva o `google_calendar_id` retornado na tabela `events`
- Suporta update e delete também

**Pull (Google Calendar → Sistema):**
- Busca eventos do Google Calendar num range de datas
- Para cada evento sem correspondência na tabela `events`, cria um registro local
- Eventos já sincronizados (pelo `google_calendar_id`) são ignorados ou atualizados

#### 3. Configuração do Calendar ID
- Adicionar campo `google_calendar_id` nas configurações do sistema (pode ser uma tabela `system_settings` ou config existente)
- Armazenar qual Google Calendar ID usar para push/pull

#### 4. Atualizar escopo da Service Account
- Mudar o scope de `calendar.readonly` para `https://www.googleapis.com/auth/calendar` (leitura + escrita)

#### 5. Integrar no fluxo de criação/edição/exclusão de eventos
- No `useCreateEvent`, após criar no banco, chamar a edge function para criar no Google Calendar
- No `useUpdateEvent`, sincronizar alterações
- No `useDeleteEvent`, remover do Google Calendar também

#### 6. Cron job para pull automático
- Criar cron job (pg_cron) que chama a edge function de pull periodicamente (ex: a cada 15 minutos) para trazer eventos criados diretamente no Google Calendar

### Detalhes técnicos

- A Service Account precisa ter permissão de **escrita** no calendário (o calendário deve ser compartilhado com o email da SA com permissão "Fazer alterações nos eventos")
- O scope JWT muda de `calendar.readonly` para `calendar`
- Participantes serão resolvidos: nome → email via tabela `profiles`, e então adicionados como attendees no Google Calendar
- O `sendUpdates: "all"` será usado na API do Google para enviar convites por email automaticamente

### Pré-requisito do usuário
- O Google Calendar alvo precisa estar compartilhado com a Service Account com permissão de **edição** (não apenas visualização)

