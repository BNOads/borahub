

## Plano: Corrigir Mudança de Data ao Concluir Tarefas

### Problema Identificado

Quando uma data no formato `"2026-01-26"` é passada para `new Date()`, o JavaScript a interpreta como **meia-noite UTC**. Quando essa data é formatada para exibição no fuso horário brasileiro (UTC-3), ela aparece como **25 de janeiro** (dia anterior).

### Exemplo do Bug

```
Data no banco: "2026-01-26"
new Date("2026-01-26") → Sun Jan 26 2026 00:00:00 GMT+0000 (UTC)
Formatado em Brasília (UTC-3) → "25 de jan." ❌
```

### Solução

Adicionar `"T00:00:00"` às strings de data para forçar a interpretação como **horário local**:

```
new Date("2026-01-26T00:00:00") → Sun Jan 26 2026 00:00:00 GMT-0300 (BRT)
Formatado em Brasília → "26 de jan." ✅
```

---

### Arquivos a Modificar

#### 1. `src/pages/Tarefas.tsx`
- **Linha 325**: `formatDate` - adicionar `T00:00:00`
- **Linha 334**: `isOverdue` - adicionar `T00:00:00`

#### 2. `src/components/tasks/TaskKanban.tsx`
- **Linha 119**: `formatDate` - adicionar `T00:00:00`
- **Linha 128**: `isOverdue` - adicionar `T00:00:00`

#### 3. `src/components/tasks/AdminTasksPanel.tsx`
- **Linha 223**: `isOverdue` - adicionar `T00:00:00`
- **Linha 231**: `formatDate` - adicionar `T00:00:00`

#### 4. `src/pages/TarefaDetalhe.tsx`
- **Linha 183**: `formatDate` - adicionar `T00:00:00`

#### 5. `src/components/tasks/TaskDetailDialog.tsx`
- **Linha 192**: `formatDate` - adicionar `T00:00:00`

---

### Detalhes Técnicos

**Padrão da correção:**

```typescript
// ANTES (bugado)
const formatDate = (dateString: string | null) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", { ... });
};

// DEPOIS (corrigido)
const formatDate = (dateString: string | null) => {
  if (!dateString) return "";
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("pt-BR", { ... });
};
```

**Para funções `isOverdue`:**

```typescript
// ANTES
const date = new Date(dateString);

// DEPOIS
const date = new Date(dateString + "T00:00:00");
```

---

### Resultado Esperado

Após as correções:
- Datas exibidas corretamente independente do fuso horário do usuário
- A tarefa com data "26 de jan." continuará mostrando "26 de jan." após ser concluída
- Verificações de atraso (overdue) funcionarão corretamente

