

# Plano: Ferramenta de Funil de Sessão Estratégica

## Resumo

Nova página independente `/sessao-estrategica` com dashboard de KPIs, CRM Kanban de leads, integração com Google Calendar (conta centralizada), importação via Google Sheets, relatórios diários de SDR/Closer, links úteis, monitoramento de reuniões ao vivo, rastreamento de UTMs e link público para acesso sem login.

---

## 1. Banco de Dados — Novas Tabelas

### `strategic_sessions` — Sessões/Campanhas estratégicas
- `id` (uuid, PK)
- `name` (text) — Nome da sessão (ex: "Sessão Estratégica MBA 2026")
- `description` (text, nullable)
- `status` (text, default 'active') — active / finished
- `google_sheet_url` (text, nullable) — URL da planilha vinculada
- `google_calendar_id` (text, nullable) — ID do calendário Google
- `public_slug` (text, unique, nullable) — slug para link público
- `created_by` (uuid, FK profiles)
- `created_at`, `updated_at` (timestamptz)

### `strategic_leads` — Leads do CRM
- `id` (uuid, PK)
- `session_id` (uuid, FK strategic_sessions)
- `name` (text)
- `email` (text, nullable)
- `phone` (text, nullable)
- `stage` (text, default 'lead') — lead / qualificado / agendado / realizado / venda
- `is_qualified` (boolean, default false) — Qualificação automática
- `qualification_score` (numeric, nullable)
- `qualification_notes` (text, nullable)
- `utm_source` (text, nullable)
- `utm_medium` (text, nullable)
- `utm_campaign` (text, nullable)
- `utm_content` (text, nullable)
- `meeting_date` (timestamptz, nullable) — Data da reunião agendada
- `meeting_notes` (text, nullable)
- `sale_value` (numeric, nullable)
- `assigned_to` (uuid, FK profiles, nullable) — SDR ou Closer
- `extra_data` (jsonb, default '{}') — Dados extras da planilha
- `source_row_id` (text, nullable) — ID da linha na planilha (para evitar duplicatas)
- `order_index` (int, default 0)
- `created_at`, `updated_at` (timestamptz)

### `strategic_lead_history` — Histórico de movimentação
- `id` (uuid, PK)
- `lead_id` (uuid, FK strategic_leads)
- `previous_stage` (text, nullable)
- `new_stage` (text)
- `changed_by` (uuid, FK profiles, nullable)
- `changed_by_name` (text, nullable)
- `changed_at` (timestamptz, default now())

### `strategic_daily_reports` — Relatórios diários SDR/Closer
- `id` (uuid, PK)
- `session_id` (uuid, FK strategic_sessions)
- `report_date` (date)
- `report_type` (text) — 'sdr' ou 'closer'
- `author_id` (uuid, FK profiles, nullable)
- `author_name` (text)
- `contacts` (int, default 0)
- `followups` (int, default 0)
- `meetings_scheduled` (int, default 0)
- `meetings_held` (int, default 0)
- `no_shows` (int, default 0)
- `sales` (int, default 0)
- `summary` (text, nullable)
- `created_at` (timestamptz)

### `strategic_links` — Links úteis
- `id` (uuid, PK)
- `session_id` (uuid, FK strategic_sessions)
- `name` (text)
- `url` (text)
- `category` (text, nullable) — ex: "CRM", "Planilha", "Briefing"
- `order_index` (int, default 0)
- `created_at` (timestamptz)

### `strategic_qualification_criteria` — Critérios de qualificação (admin)
- `id` (uuid, PK)
- `session_id` (uuid, FK strategic_sessions)
- `field_name` (text) — Nome do campo da planilha a avaliar
- `operator` (text) — equals, contains, greater_than, etc.
- `value` (text) — Valor esperado
- `weight` (numeric, default 1) — Peso do critério
- `created_at` (timestamptz)

### RLS
- Leitura: authenticated users
- Escrita: admin/manager
- `strategic_leads`: update também para users com `assigned_to = auth.uid()`
- Tabelas com slug público: SELECT com `true` para permitir acesso público via slug

---

## 2. Edge Function: Google Sheets Sync

### `sync-strategic-leads/index.ts`
- Recebe `session_id` como parâmetro
- Usa a `GOOGLE_SERVICE_ACCOUNT_KEY` (já configurada) para acessar a planilha
- Lê todas as linhas, mapeia colunas para campos de `strategic_leads`
- Upsert por `source_row_id` para evitar duplicatas
- Aplica critérios de qualificação da tabela `strategic_qualification_criteria`
- Extrai UTMs das colunas mapeadas
- Retorna contagem de novos/atualizados

### `fetch-google-calendar-events/index.ts`
- Recebe `calendar_id` e `date` como parâmetros
- Usa `GOOGLE_SERVICE_ACCOUNT_KEY` para ler eventos do dia
- Retorna lista de eventos com horário, título, participantes e status (em andamento / futuro / concluído)

---

## 3. Estrutura de Componentes

### Página principal: `src/pages/SessaoEstrategica.tsx`
- Lista de sessões estratégicas (cards)
- Botão criar nova sessão
- Ao clicar, navega para `/sessao-estrategica/:id`

### Página de detalhe: `src/pages/SessaoEstrategicaDetalhe.tsx`
- Tabs: **Dashboard** | **CRM** | **Relatórios** | **Configuração**

#### Tab Dashboard
- **Cards de KPIs**: Leads total, Qualificados, Agendados, Realizados, Vendas (contagem por stage)
- **Reuniões do dia** (Google Calendar): Card com eventos de hoje, destaque para "agora"
- **Gráfico de fontes UTM**: BarChart com leads por utm_source, com indicador de qualificação

#### Tab CRM (Kanban)
- Colunas: Lead → Qualificado → Agendado → Realizado → Venda
- Drag & drop entre colunas (usa `@dnd-kit` já instalado)
- Card do lead: nome, telefone, fonte UTM, data reunião, badge de qualificação
- Ao clicar: sheet lateral com detalhes completos, histórico de movimentação, anotações
- Filtros: por UTM source, por qualificação, por responsável

#### Tab Relatórios
- Duas seções: "SDR" e "Closer"
- Formulário de relatório diário (similar ao FunnelDailyReport existente)
- Histórico tabelado com totais acumulados
- Campo de anotação do dia (resumo)
- Export CSV/PDF

#### Tab Configuração
- Info geral da sessão (nome, descrição)
- Google Sheet URL + botão "Sincronizar agora"
- Google Calendar ID
- Critérios de qualificação (CRUD)
- Links úteis (CRUD)
- Gerar/copiar link público

---

## 4. Link Público

### Rota: `/se/:slug` (pública, sem auth)
### Página: `src/pages/PublicSessaoEstrategica.tsx`

Exibe versão somente-leitura:
- KPIs consolidados (leads, qualificados, agendados, realizados, vendas)
- Reuniões do dia (do Google Calendar)
- Links úteis
- Relatório do dia mais recente (SDR + Closer)
- Sem CRM/Kanban (dados sensíveis)

---

## 5. Hook Principal

### `src/hooks/useStrategicSession.ts`
- `useStrategicSessions()` — lista
- `useStrategicSession(id)` — detalhe
- `useStrategicLeads(sessionId, filters)` — leads com filtros
- `useUpdateLeadStage()` — mover no kanban + gravar histórico
- `useStrategicDailyReports(sessionId)` — relatórios
- `useCreateDailyReport()` — criar/editar
- `useStrategicLinks(sessionId)` — links
- `useSyncGoogleSheet(sessionId)` — trigger sync
- `useGoogleCalendarEvents(calendarId, date)` — eventos do dia
- `useQualificationCriteria(sessionId)` — critérios
- `useUTMAnalytics(sessionId)` — dados agrupados por UTM

---

## 6. Rastreamento de UTMs

- Ao importar leads da planilha, extrair colunas `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`
- No dashboard, agrupar leads por `utm_source` com query:
  - Total leads por fonte
  - % qualificados por fonte
  - Conversão até venda por fonte
- Visualização com BarChart (recharts, já instalado)

---

## 7. Navegação

- Adicionar "Sessão Estratégica" no menu/header com ícone `Crosshair` do lucide
- Rotas:
  - `/sessao-estrategica` — lista de sessões (protegida)
  - `/sessao-estrategica/:id` — detalhe (protegida)
  - `/se/:slug` — versão pública (sem auth)

---

## Detalhes Técnicos

- Google Calendar API via service account (REST API na edge function)
- Google Sheets API via service account (REST API na edge function)
- Kanban com `@dnd-kit/core` + `@dnd-kit/sortable` (já instalados)
- Gráficos com `recharts` (já instalado)
- Qualificação: para cada lead importado, avalia todos os critérios → se score >= threshold, marca `is_qualified = true`
- Slug público: gerado automaticamente (6 chars aleatórios) ou customizável pelo admin

