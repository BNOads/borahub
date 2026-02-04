
# Plano: Refatoração do Sistema de Datas e Filtro de Concluídas

## Contexto do Problema
O filtro "Hoje" não está exibindo corretamente as tarefas concluídas no dia atual. A causa raiz é a inconsistência na conversão de timestamps UTC do banco de dados para datas locais do navegador do administrador.

### Dados do Banco (exemplo)
```
completed_at: "2026-02-04 14:41:29.882+00"  (UTC)
```
Deveria aparecer como "concluída hoje" no fuso do admin (ex: São Paulo = UTC-3), mas o parsing atual falha em alguns casos.

---

## Solução: Utilitário Centralizado de Datas

Criar um módulo único (`src/lib/dateUtils.ts`) com funções robustas de parsing e comparação, eliminando código duplicado e inconsistências.

### 1. Novo arquivo: `src/lib/dateUtils.ts`

Funções a implementar:

```text
┌─────────────────────────────────────────────────────────────────┐
│  parseToLocalDate(timestamp: string | null): Date | null       │
│  ────────────────────────────────────────────────────────────── │
│  Converte qualquer formato de timestamp/data do banco          │
│  para um objeto Date no fuso local do navegador.               │
│  Suporta:                                                      │
│    - "2026-02-04 14:41:29.882+00" (Postgres timestamptz)       │
│    - "2026-02-04T14:41:29.882Z" (ISO)                          │
│    - "2026-02-04" (date-only)                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  toLocalDateString(timestamp: string | null): string | null    │
│  ────────────────────────────────────────────────────────────── │
│  Retorna a data local no formato "YYYY-MM-DD".                 │
│  Usa parseToLocalDate internamente.                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  isToday(timestamp: string | null): boolean                    │
│  ────────────────────────────────────────────────────────────── │
│  Verifica se o timestamp corresponde ao dia atual local.       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  isInDateRange(date: string | null, range, customStart, end)   │
│  ────────────────────────────────────────────────────────────── │
│  Lógica centralizada de filtros: today, week, month, etc.      │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Refatorar `src/pages/Tarefas.tsx`

**Remover:**
- Função `normalizeTimestamp` inline
- Função `toDateOnly` inline  
- Função `isInDateRange` inline
- Função `getRelevantDateForTask` inline

**Importar e usar:**
```typescript
import { toLocalDateString, isInDateRange } from "@/lib/dateUtils";
```

**Lógica do filtro:**
```typescript
const getRelevantDateForTask = (task: TaskWithSubtasks): string | null => {
  if (task.completed) {
    return toLocalDateString(task.completed_at) ?? toLocalDateString(task.due_date);
  }
  return toLocalDateString(task.due_date);
};

// No filter:
const relevantDate = getRelevantDateForTask(task);
const inRange = isInDateRange(relevantDate, filterDateRange, customDateStart, customDateEnd);
```

### 3. Refatorar `src/components/tasks/TasksByPersonView.tsx`

**Remover:**
- Função `wasCompletedToday` com `normalizeTimestamp` duplicado

**Importar e usar:**
```typescript
import { isToday } from "@/lib/dateUtils";

const wasCompletedToday = (task: Task): boolean => isToday(task.completed_at);
```

### 4. Refatorar `src/components/tasks/TaskDetailDialog.tsx`

Usar o novo utilitário para formatar datas de criação/conclusão.

---

## Detalhes Técnicos da Conversão

O problema central está no formato do Postgres: `"2026-02-04 14:41:29.882+00"` (espaço em vez de "T", offset sem minutos).

**Normalização robusta:**
```typescript
function normalizePostgresTimestamp(raw: string): string {
  let v = raw.trim();
  
  // "2026-02-04 14:41:29" → "2026-02-04T14:41:29"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v)) {
    v = v.replace(' ', 'T');
  }
  
  // "+00" → "+00:00" (offset sem minutos)
  if (/[+-]\d{2}$/.test(v)) {
    v = v.replace(/([+-]\d{2})$/, '$1:00');
  }
  
  return v;
}
```

**Parsing seguro:**
```typescript
function parseToLocalDate(value: string | null): Date | null {
  if (!value) return null;
  
  // Se já é date-only (YYYY-MM-DD), trata como meia-noite local
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value + 'T00:00:00');
  }
  
  // Normaliza e converte timestamp
  const normalized = normalizePostgresTimestamp(value);
  const parsed = new Date(normalized);
  
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
```

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/lib/dateUtils.ts` | **Criar** - Utilitários centralizados |
| `src/pages/Tarefas.tsx` | **Editar** - Usar utilitários, remover duplicatas |
| `src/components/tasks/TasksByPersonView.tsx` | **Editar** - Usar `isToday` centralizado |
| `src/components/tasks/TaskDetailDialog.tsx` | **Editar** - Usar formatação consistente |

---

## Resultado Esperado

1. Todas as tarefas concluídas hoje (no fuso do admin) aparecerão corretamente no filtro "Hoje"
2. O contador "Concluídas: 2" mostrará o valor correto
3. Código mais limpo e sem duplicação
4. Base sólida para futuros filtros de data
