
# Plano: Relatório Diário para Funis High Ticket

## Resumo

Para funis da categoria "High Ticket":
1. Remover as abas "Checklist" e "Deu Bom & Deu Mole"
2. Adicionar nova aba "Relatório" com preenchimento dia-a-dia
3. Permitir configurar o responsável pelo funil
4. Mostrar popup diário para o responsável preencher o relatório
5. Disparar webhook quando o relatório do dia for preenchido

---

## Estrutura do Banco de Dados

### Nova tabela: `funnel_daily_reports`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| funnel_id | uuid | FK para funnels |
| report_date | date | Data do relatório |
| contacts | integer | Contatos do dia |
| followups | integer | Follow-ups realizados |
| reschedules | integer | Reagendamentos |
| meetings_scheduled | integer | Reuniões agendadas |
| meetings_held | integer | Reuniões realizadas |
| no_shows | integer | No-shows |
| sales | integer | Vendas do dia |
| summary | text | Resumo do dia (texto livre) |
| created_by | uuid | FK para profiles |
| created_at | timestamptz | Data de criação |

### Alteração na tabela `funnels`

Adicionar coluna:
- `responsible_user_id` (uuid, nullable) - FK para profiles

---

## Arquivos a Criar

### 1. `src/components/funnel-panel/FunnelDailyReport.tsx`

Componente principal da aba "Relatório":
- Tabela com histórico de relatórios dia-a-dia
- Formulário para preencher relatório do dia atual
- Seletor de responsável pelo funil
- Cada linha mostra: Data, Contatos, Follow-ups, Reagendamento, Reunião Agendada, Reunião Realizada, No-show, Vendas, Resumo

```text
┌─────────────────────────────────────────────────────────────────┐
│  [Responsável: ▼ Selecionar usuário]                            │
├─────────────────────────────────────────────────────────────────┤
│  📊 Relatório do Dia (05/02/2026)                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Contatos: [___] Follow-ups: [___] Reagend.: [___]           ││
│  │ Reunião Agend.: [___] Reunião Real.: [___] No-show: [___]   ││
│  │ Vendas: [___]                                               ││
│  │ Resumo: [____________________________________]              ││
│  │                                    [Salvar Relatório]       ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  📅 Histórico                                                   │
│  ┌─────┬────────┬────────┬───────┬───────┬───────┬─────┬─────┐ │
│  │Data │Contatos│Followup│Reagen.│Ag.    │Real.  │No-sh│Vendas│ │
│  ├─────┼────────┼────────┼───────┼───────┼───────┼─────┼─────┤ │
│  │04/02│   12   │   8    │   2   │   5   │   3   │  1  │  1  │ │
│  │03/02│   15   │   10   │   1   │   4   │   4   │  0  │  2  │ │
│  └─────┴────────┴────────┴───────┴───────┴───────┴─────┴─────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2. `src/components/funnel-panel/DailyReportPopup.tsx`

Popup/modal que aparece diariamente para o usuário responsável:
- Verifica se o usuário logado é responsável por algum funil High Ticket ativo
- Verifica se já preencheu o relatório de hoje
- Se não preencheu, mostra o popup com os campos para preenchimento
- Após salvar, dispara o webhook

### 3. `src/hooks/useFunnelDailyReports.ts`

Hook para gerenciar os relatórios diários:
- `useFunnelDailyReports(funnelId)` - Lista relatórios do funil
- `useCreateDailyReport()` - Criar relatório + disparar webhook
- `usePendingDailyReports()` - Verifica funis onde o usuário é responsável e não preencheu hoje

### 4. Edge Function: `supabase/functions/funnel-daily-report-webhook/index.ts`

Endpoint para disparar webhook externo:
- Recebe os dados do relatório
- Envia para URL configurada (pode ser armazenada em secret ou na tabela funnels)

---

## Arquivos a Modificar

### 1. `src/pages/FunnelPanel.tsx`

**Mudanças:**
- Adicionar condição `isHighTicket = funnel.category === "High ticket"`
- Ocultar abas "Checklist" e "Deu Bom & Deu Mole" quando `isHighTicket`
- Adicionar aba "Relatório" apenas quando `isHighTicket`
- Importar e renderizar `FunnelDailyReport`

```typescript
// Exemplo de lógica condicional
const isHighTicket = funnel.category === "High ticket";

// Na TabsList:
{!isHighTicket && (
  <TabsTrigger value="checklist">Checklist</TabsTrigger>
)}
{isHighTicket && (
  <TabsTrigger value="relatorio">Relatório</TabsTrigger>
)}
{!isHighTicket && (
  <TabsTrigger value="diary">Deu Bom & Deu Mole</TabsTrigger>
)}
```

### 2. `src/components/funnel-panel/types.ts`

Adicionar interfaces:
- `FunnelDailyReport` - Tipo para os relatórios diários
- Atualizar `FunnelData` com `responsible_user_id`

### 3. `src/components/layout/MainLayout.tsx`

Adicionar o `DailyReportPopup` no layout principal:
```typescript
import { DailyReportPopup } from "@/components/funnel-panel/DailyReportPopup";

// No return:
<DailyReportPopup />
```

### 4. `src/components/funnel-panel/index.ts`

Exportar os novos componentes.

---

## Fluxo do Popup Diário

```text
┌──────────────────────────────────────────────────────────────────┐
│  Usuário faz login                                               │
│       ↓                                                          │
│  MainLayout renderiza DailyReportPopup                           │
│       ↓                                                          │
│  Hook verifica:                                                  │
│  1. Há funis High Ticket ativos onde user é responsável?         │
│  2. Já preencheu relatório de hoje para cada funil?              │
│       ↓                                                          │
│  SE há funil pendente → Mostra popup                             │
│       ↓                                                          │
│  Usuário preenche e salva                                        │
│       ↓                                                          │
│  1. Salva no banco (funnel_daily_reports)                        │
│  2. Chama edge function para disparar webhook                    │
│  3. Fecha popup (ou mostra próximo funil pendente)               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Webhook

O webhook será disparado com payload:
```json
{
  "funnel_id": "uuid",
  "funnel_name": "Nome do Funil",
  "report_date": "2026-02-05",
  "contacts": 12,
  "followups": 8,
  "reschedules": 2,
  "meetings_scheduled": 5,
  "meetings_held": 3,
  "no_shows": 1,
  "sales": 1,
  "summary": "Resumo do dia...",
  "reported_by": "Nome do Responsável",
  "reported_at": "2026-02-05T18:30:00Z"
}
```

A URL do webhook pode ser configurada via:
1. Secret no projeto (`FUNNEL_REPORT_WEBHOOK_URL`)
2. Campo na tabela funnels (mais flexível, permite URL diferente por funil)

---

## Resumo das Mudanças

| Tipo | Item |
|------|------|
| **Banco** | Nova tabela `funnel_daily_reports` |
| **Banco** | Nova coluna `responsible_user_id` em `funnels` |
| **Criar** | `src/components/funnel-panel/FunnelDailyReport.tsx` |
| **Criar** | `src/components/funnel-panel/DailyReportPopup.tsx` |
| **Criar** | `src/hooks/useFunnelDailyReports.ts` |
| **Criar** | `supabase/functions/funnel-daily-report-webhook/index.ts` |
| **Editar** | `src/pages/FunnelPanel.tsx` |
| **Editar** | `src/components/funnel-panel/types.ts` |
| **Editar** | `src/components/funnel-panel/index.ts` |
| **Editar** | `src/components/layout/MainLayout.tsx` |
