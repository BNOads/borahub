
# Plano: Corrigir Exibição de Tarefas Concluídas Hoje

## Problema Identificado

O banco de dados tem **676 tarefas** (76 pendentes + 600 concluídas), mas o hook `useTasks` retorna apenas **500** tarefas com a seguinte ordenação:

1. `completed ASC` (pendentes primeiro)
2. `due_date ASC` (ordenadas por vencimento antigo)
3. `created_at DESC`

Isso faz com que tarefas concluídas hoje, mas com `due_date` antiga (ex: `2026-01-23`), fiquem fora do limite e não apareçam no filtro "Hoje".

Por exemplo, a tarefa "CMB 14 | Copys do email domingo 25/01":
- `due_date: 2026-01-23` (antiga)
- `completed_at: 2026-02-04 14:41:29` (hoje)
- Esta tarefa aparece no final da ordenação por due_date e é cortada pelo limite.

---

## Solução: Ordenação Inteligente para Concluídas Recentes

Alterar o hook `useTasks` para usar ordenação que priorize:
1. Pendentes primeiro
2. Concluídas recentemente (por `completed_at` descendente) acima das antigas

### Arquivo: `src/hooks/useTasks.ts`

**Mudanças na query:**

```text
┌─────────────────────────────────────────────────────────────────┐
│  ANTES                                                          │
│  ────────────────────────────────────────────────────────────── │
│  .order("completed", { ascending: true })                       │
│  .order("due_date", { ascending: true, nullsFirst: false })     │
│  .order("created_at", { ascending: false })                     │
│  .limit(500)                                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  DEPOIS                                                         │
│  ────────────────────────────────────────────────────────────── │
│  .order("completed", { ascending: true })                       │
│  .order("completed_at", { ascending: false, nullsFirst: true }) │
│  .order("due_date", { ascending: true, nullsFirst: false })     │
│  .limit(600)                                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Lógica:**
1. Pendentes primeiro (`completed ASC`)
2. Dentre as concluídas, as mais recentes primeiro (`completed_at DESC`)
3. Pendentes ordenadas por vencimento (`due_date ASC`)
4. Aumentar limite para 600 para cobrir volume atual

### Arquivo: `src/pages/Tarefas.tsx`

**Adicionar console.log de diagnóstico** (temporário) para verificar se a filtragem está funcionando:

```typescript
// Após filtrar teamTasks, log quantas tarefas concluídas hoje
const completedToday = tasks.filter(t => {
  if (!t.completed) return false;
  const completedDate = toLocalDateString(t.completed_at);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  return completedDate === todayStr;
});
console.log(`[DEBUG] Tarefas concluídas hoje: ${completedToday.length}`, completedToday);
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useTasks.ts` | **Editar** - Mudar ordenação e aumentar limite |
| `src/pages/Tarefas.tsx` | **Editar** - Adicionar logs de diagnóstico (opcional, remover depois) |

---

## Resultado Esperado

1. Todas as 15 tarefas concluídas hoje aparecerão no filtro "Hoje"
2. O contador "Concluídas: X" mostrará o valor correto
3. Tarefas concluídas recentemente terão prioridade visual

---

## Considerações Técnicas

- O limite de 600 é conservador; pode ser ajustado conforme o volume crescer
- A ordenação por `completed_at DESC` garante que conclusões recentes apareçam primeiro
- O `nullsFirst: true` para `completed_at` mantém pendentes no topo (pois pendentes têm `completed_at = null`)
