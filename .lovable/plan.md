

# Plano: Renomear "Gestão de Usuários" para "Diretoria" e adicionar aba de Metas e OKRs

## Resumo

Renomear a página de administração de "Gestão de Usuários" para "Diretoria", atualizar as referências na navegação e adicionar uma nova aba "Metas e OKRs" com sistema completo de criação e acompanhamento de objetivos, indicadores e resultados-chave.

---

## 1. Renomear para "Diretoria"

**Arquivos afetados:**
- `src/pages/admin/GestaoUsuarios.tsx` — Alterar titulo de "Gestão de Usuários" para "Diretoria"
- `src/components/layout/Header.tsx` — Alterar label do menu dropdown de "Gestao de Usuarios" para "Diretoria"
- `src/App.tsx` — Alterar rota de `/admin/usuarios` para `/admin/diretoria`

---

## 2. Criar tabelas no banco de dados

Novas tabelas para o sistema de Metas e OKRs:

**`okr_cycles`** — Ciclos/períodos de OKRs (ex: Q1 2026, Q2 2026)
- `id` (uuid, PK)
- `name` (text) — ex: "OKRs 2026 - Q1"
- `start_date`, `end_date` (date)
- `created_by` (uuid, FK profiles)
- `created_at`, `updated_at` (timestamptz)

**`okr_objectives`** — Objetivos (Metas)
- `id` (uuid, PK)
- `cycle_id` (uuid, FK okr_cycles)
- `title` (text) — ex: "Faturamento de 2mi com lucro mínimo de 1mi"
- `description` (text, nullable)
- `color` (text, default '#3b82f6')
- `owner_id` (uuid, FK profiles, nullable)
- `order_index` (int, default 0)
- `created_at`, `updated_at` (timestamptz)

**`okr_key_results`** — Resultados-Chave / Indicadores
- `id` (uuid, PK)
- `objective_id` (uuid, FK okr_objectives)
- `title` (text) — ex: "100 vendas do ACE (400K)"
- `target_value` (numeric) — meta numérica (ex: 100)
- `current_value` (numeric, default 0) — valor atual
- `unit` (text, nullable) — ex: "vendas", "R$", "%"
- `owner_id` (uuid, FK profiles, nullable)
- `order_index` (int, default 0)
- `created_at`, `updated_at` (timestamptz)

RLS: Authenticated users can read all. Admin/manager can insert/update/delete.

---

## 3. Criar componentes da aba "Metas e OKRs"

**`src/components/admin/MetasOKRsTab.tsx`** — Componente principal da aba:
- Seletor de ciclo (dropdown)
- Botão "+ Novo Ciclo" e "+ Nova Meta"
- Grid de cards de objetivos (como no screenshot):
  - Cada card mostra: titulo, progresso circular (%), contagem de KRs
  - Ao clicar, expande/navega para detalhe do objetivo

**`src/components/admin/CreateCycleModal.tsx`** — Modal para criar/editar ciclo:
- Nome, data início, data fim

**`src/components/admin/CreateObjectiveModal.tsx`** — Modal para criar/editar objetivo:
- Titulo, descrição, cor, responsável, ciclo

**`src/components/admin/ObjectiveDetail.tsx`** — Detalhe do objetivo expandido:
- Progresso circular grande
- Titulo e período
- Lista de Key Results com barra de progresso e valor atual/meta
- Botão "+ Adicionar" resultado-chave

**`src/components/admin/CreateKeyResultModal.tsx`** — Modal para criar/editar KR:
- Titulo, valor meta, valor atual, unidade, responsável

**`src/hooks/useOKRs.ts`** — Hook com queries e mutations para ciclos, objetivos e KRs

---

## 4. Integrar aba na página Diretoria

No `GestaoUsuarios.tsx` (renomeado conceitualmente para Diretoria), adicionar a terceira aba:

```
Tabs: [Usuários] [Departamentos] [Metas e OKRs]
```

Usar icone `Target` do lucide-react para a aba.

---

## 5. UI dos cards de objetivos (baseado nos screenshots)

Cada card de objetivo terá:
- Barra colorida no topo (cor do objetivo)
- Progresso circular com percentual
- Titulo do objetivo
- Link "X objetivos" (contagem de KRs)
- Data de criação

O detalhe do objetivo mostrará:
- Progresso circular grande à esquerda
- Titulo + período à direita
- Lista de KRs com: titulo, barra de progresso, valor atual/meta (ex: "10/100")
- Botão de edição inline do valor atual

---

## Detalhes Técnicos

- Progresso do objetivo = média dos progressos dos KRs (`current_value / target_value * 100`)
- Componente de progresso circular usando SVG (circle com stroke-dasharray)
- Todas as tabelas com RLS habilitado
- Políticas: leitura para authenticated, escrita para admin/manager via `has_role()`

