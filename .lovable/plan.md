

# Plano: Reestruturar Sessões Estratégicas — Unificar Funcionalidades na Página Principal

## Problema Atual

A página `/sessao-estrategica` funciona como uma listagem de "funis" com navegação para uma página de detalhe separada (`/sessao-estrategica/:id`). O usuário quer que as sessões sejam tratadas como **reuniões** e que todas as funcionalidades (Dashboard, CRM, Relatórios, Configuração) fiquem disponíveis diretamente na página principal, sem precisar navegar para outra rota.

## O que Muda

1. **Página principal (`SessaoEstrategica.tsx`)** — Será completamente reestruturada:
   - Seletor de sessão no topo (dropdown ou lista lateral) em vez de cards com navegação
   - 4 abas principais: **Dashboard** (KPIs + reuniões Cal.com + UTM), **CRM** (Kanban + Google Sheets), **Relatórios** (SDR/Closer), **Configuração** (integrações, links, critérios, link público)
   - Tudo dentro da mesma página, sem redirecionamento

2. **Componentes reutilizados da página de detalhe:**
   - `StrategicDashboardTab` — Dashboard com KPIs, reuniões do dia (Cal.com) e gráfico UTM
   - `StrategicCRMTab` — Kanban drag-and-drop de leads com 5 estágios
   - `StrategicReportsTab` — Relatórios diários SDR/Closer
   - `StrategicConfigTab` — Google Sheets, Calendar, links úteis, critérios de qualificação, link público

3. **Página de detalhe (`SessaoEstrategicaDetalhe.tsx`)** — Mantida como rota alternativa mas agora redundante (pode ser removida futuramente ou redirecionar)

## Estrutura da Nova Página

```text
┌──────────────────────────────────────────┐
│ Sessões Estratégicas  [Sessão ▼] [+Nova] │
├──────────────────────────────────────────┤
│ Dashboard │ CRM │ Relatórios │ Config    │
├──────────────────────────────────────────┤
│                                          │
│  (conteúdo da aba selecionada            │
│   usando a sessão ativa do dropdown)     │
│                                          │
└──────────────────────────────────────────┘
```

## Detalhes Técnicos

### `SessaoEstrategica.tsx` — Reescrita
- Dropdown `<Select>` no header para escolher a sessão ativa
- Estado local `selectedSessionId` controlando qual sessão está selecionada
- 4 `TabsContent` reutilizando os componentes já existentes:
  - `<StrategicDashboardTab session={session} leads={leads} stageCounts={stageCounts} />`
  - `<StrategicCRMTab sessionId={session.id} leads={leads} />` com seção Google Sheets acima
  - `<StrategicReportsTab sessionId={session.id} />`
  - `<StrategicConfigTab session={session} />`
- Hooks utilizados: `useStrategicSessions`, `useStrategicSession`, `useStrategicLeads`, `useCalComEvents`, `useCreateSession`
- Modal de criação de sessão mantido como está

### Nenhuma alteração no banco de dados
- Todos os dados já existem nas tabelas `strategic_sessions`, `strategic_leads`, etc.
- Nenhuma migração necessária

