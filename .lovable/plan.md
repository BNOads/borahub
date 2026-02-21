
# Central de Tickets BORA

## Resumo
Novo modulo completo de suporte ao cliente com tickets, SLA, historico, anexos, integracao automatica com tarefas, dashboard executivo e card na home.

---

## 1. Banco de Dados (Migrations)

### Tabela `tickets`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| numero | serial | Numero sequencial visivel |
| cliente_nome | text NOT NULL | |
| cliente_email | text NOT NULL | |
| cliente_whatsapp | text NOT NULL | |
| origem | text NOT NULL | Ex: WhatsApp, Email, Telefone, Site |
| categoria | text NOT NULL | Ex: Financeiro, Tecnico, Comercial |
| descricao | text NOT NULL | |
| prioridade | text NOT NULL | critica, alta, media, baixa |
| status | text NOT NULL DEFAULT 'aberto' | aberto, em_atendimento, aguardando_cliente, escalado, resolvido, encerrado |
| responsavel_id | uuid NOT NULL | FK profiles(id) |
| criado_por | uuid NOT NULL | FK auth.users via profiles |
| sla_limite | timestamptz | Calculado automaticamente na criacao |
| primeira_resposta_em | timestamptz NULL | |
| encerrado_em | timestamptz NULL | |
| tempo_resolucao | integer NULL | Em minutos |
| solucao_descricao | text NULL | Obrigatorio no encerramento |
| linked_task_id | uuid NULL | ID da tarefa gerada automaticamente |
| created_at | timestamptz DEFAULT now() |
| updated_at | timestamptz DEFAULT now() |

### Tabela `ticket_logs`
| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| ticket_id | uuid FK tickets(id) ON DELETE CASCADE |
| usuario_id | uuid |
| usuario_nome | text |
| acao | text NOT NULL | Ex: criado, status_alterado, responsavel_transferido, comentario, anexo_adicionado, encerrado |
| descricao | text |
| campo_alterado | text NULL |
| valor_anterior | text NULL |
| valor_novo | text NULL |
| created_at | timestamptz |

### Tabela `ticket_anexos`
| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| ticket_id | uuid FK tickets(id) ON DELETE CASCADE |
| arquivo_url | text NOT NULL |
| arquivo_nome | text NOT NULL |
| enviado_por | uuid |
| enviado_por_nome | text |
| created_at | timestamptz |

### Tabela `tasks` (alteracao)
- Adicionar coluna `ticket_id uuid NULL` referenciando tickets(id)

### Storage
- Criar bucket `ticket-anexos` (publico) com policies para upload/leitura por usuarios autenticados

### RLS Policies
- `tickets`: SELECT/INSERT/UPDATE para todos autenticados; DELETE apenas admin (via `has_role`)
- `ticket_logs`: SELECT/INSERT para todos autenticados; sem DELETE/UPDATE (logs permanentes)
- `ticket_anexos`: SELECT/INSERT para todos autenticados; DELETE apenas admin

### SLA Automatico
Calculo baseado na prioridade no momento da criacao:
- Critica: 2 horas
- Alta: 8 horas
- Media: 24 horas
- Baixa: 48 horas

### Trigger
- `handle_updated_at` no tickets para atualizar `updated_at`

---

## 2. Arquivos e Componentes

### Novos arquivos a criar:

```text
src/pages/TicketsView.tsx              -- Pagina principal com lista/filtros
src/hooks/useTickets.ts                -- CRUD, queries, mutations
src/components/tickets/
  CreateTicketModal.tsx                -- Modal de criacao
  TicketDetailSheet.tsx                -- Sheet lateral com detalhes completos
  TicketLogTimeline.tsx                -- Timeline de historico
  TicketCommentForm.tsx                -- Formulario de comentario/anexo
  TicketTransferModal.tsx              -- Modal de transferencia (motivo obrigatorio)
  TicketCloseModal.tsx                 -- Modal de encerramento (solucao + anexo obrigatorios)
  TicketFilters.tsx                    -- Barra de filtros
  TicketDashboard.tsx                  -- Dashboard executivo (admin only)
  TicketSupportCard.tsx                -- Card da home
```

### Arquivos a editar:

- `src/App.tsx` -- Adicionar rota `/tickets`
- `src/pages/Index.tsx` -- Adicionar card "Central de Suporte" ao array `allCards`
- `src/types/tasks.ts` -- Adicionar `ticket_id` ao tipo Task
- `src/hooks/useTasks.ts` -- Ajustar select para incluir `ticket_id`

---

## 3. Fluxos Principais

### Criacao de Ticket
1. Usuario preenche formulario com campos obrigatorios
2. Sistema calcula `sla_limite` baseado na prioridade
3. Insere ticket no banco
4. Automaticamente cria tarefa vinculada: "Resolver Ticket #N - Cliente"
5. Salva `linked_task_id` no ticket
6. Registra log "criado"
7. Envia notificacao para o responsavel

### Transferencia de Responsavel
1. Abre modal com campo obrigatorio "Motivo"
2. Atualiza `responsavel_id` no ticket
3. Atualiza `assigned_to_id` e `assignee` na tarefa vinculada
4. Registra log com quem transferiu, para quem e motivo
5. Envia notificacao ao novo responsavel

### Encerramento
1. Botao "Encerrar" so habilita se solucao preenchida E anexo adicionado
2. Atualiza status para "encerrado", salva `encerrado_em`, calcula `tempo_resolucao`
3. Marca tarefa vinculada como concluida
4. Registra log de encerramento

### Card da Home
- Consulta tickets abertos do usuario (responsavel_id = user.id)
- Exibe: abertos, atrasados (sla_limite < now), criticos
- Proximo SLA a vencer
- Card vermelho se atrasado, pisca se critico

---

## 4. Tela Principal (TicketsView)

Layout em lista/tabela com colunas:
- Numero, Cliente, Categoria, Prioridade, Responsavel, Status, SLA restante, Criado em

Filtros: Responsavel, Categoria, Status, Prioridade, Data
Busca por nome, email ou WhatsApp

Tabs: "Meus Tickets" | "Todos" | "Dashboard" (admin)

---

## 5. Dashboard Executivo (Admin)

- Indicadores: criados, resolvidos, abertos, atrasados, tempo medio primeira resposta, tempo medio resolucao
- Ranking: mais resolvidos, menor tempo medio, mais SLA estourados
- Graficos com Recharts: tickets/dia, por categoria, por origem
- Filtro de periodo: Hoje, Semana, Mes, Customizado

---

## Ordem de Implementacao

1. Migration (tabelas, RLS, storage bucket, coluna ticket_id em tasks)
2. Types e hooks (`useTickets.ts`)
3. Componentes de criacao e listagem
4. Detalhes, logs, comentarios, anexos
5. Transferencia e encerramento
6. Card da home
7. Dashboard executivo
8. Rotas e navegacao
