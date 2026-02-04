

# Plano: Exibir Tarefas Concluídas por Data de Conclusão

## Resumo
Corrigir a lógica de exibição para que tarefas concluídas apareçam no dia em que foram finalizadas (usando `completed_at`), permitindo que administradores vejam quem fez o quê em determinado dia.

---

## Problemas Identificados

### Problema 1: Filtro de data ignora tarefas concluídas
Na aba "Time" (`/tarefas`), o filtro de data foi ajustado para usar `completed_at` das tarefas concluídas. Porém, o componente `TasksByPersonView` descarta todas as concluídas **antes** de listá-las quando `showCompleted = false` (padrão).

**Resultado:** Mesmo que a tarefa passe pelo filtro de data, ela é removida no componente filho.

### Problema 2: Dashboard não filtra concluídas por data
No widget "Minhas Tarefas" do dashboard (`TodaysTasks.tsx`), todas as tarefas concluídas vão para o grupo `completed` sem distinção de quando foram concluídas. Uma tarefa concluída há meses aparece junto com as concluídas hoje.

---

## Solução

### Parte 1: Aba Time (TasksByPersonView)

**Lógica proposta:**
Quando houver filtro de data ativo ("Hoje", "Esta semana", etc.), exibir automaticamente as tarefas concluídas **que foram concluídas dentro do período filtrado**, mesmo com `showCompleted = false`.

Isso garante que:
- Ao filtrar "Hoje", o admin vê tarefas pendentes de hoje + tarefas concluídas hoje
- Ao desativar o filtro de data ("Todos"), volta ao comportamento atual (só mostra concluídas com o botão)

**Implementação:**
1. Passar o filtro de data ativo (`filterDateRange`) como prop para `TasksByPersonView`
2. Adicionar lógica: se `filterDateRange !== "all"`, incluir automaticamente concluídas que passaram pelo filtro de data
3. Ajustar contadores para refletir corretamente

### Parte 2: Dashboard (TodaysTasks)

**Lógica proposta:**
Mostrar apenas tarefas concluídas **hoje** no grupo "Concluídas", não todo o histórico.

**Implementação:**
1. Adicionar uma função `wasCompletedToday(task)` que verifica se `completed_at` é hoje
2. Filtrar o grupo `completed` para mostrar apenas tarefas concluídas hoje
3. Atualizar o label para "Concluídas hoje" para clareza

---

## Detalhes Técnicos

### Arquivo: `src/pages/Tarefas.tsx`

```text
Mudança: Passar filterDateRange como prop para TasksByPersonView
Linha: ~1061

<TasksByPersonView
  tasks={tasks}
  users={users}
  isLoading={isLoading}
  onToggleComplete={handleToggleComplete}
  onViewDetail={handleOpenDetail}
  onToggleDoing={handleToggleDoing}
  onDeleteTask={handleDeleteTask}
  onAddTaskForPerson={handleAddTaskForPerson}
  activeDateFilter={filterDateRange}  // NOVA PROP
/>
```

### Arquivo: `src/components/tasks/TasksByPersonView.tsx`

```text
Mudanças:
1. Adicionar prop "activeDateFilter" à interface
2. Alterar lógica de filtragem:
   - Se activeDateFilter !== "all": mostrar concluídas que estão na lista (já passaram pelo filtro de data)
   - Se activeDateFilter === "all" ou undefined: manter comportamento atual (só com botão showCompleted)
3. Atualizar contadores para refletir tarefas concluídas visíveis

Lógica resumida:
const shouldShowTask = (task) => {
  if (!task.completed) return true; // Pendentes sempre visíveis
  // Para concluídas: mostrar se showCompleted OU se há filtro de data ativo
  return showCompleted || (activeDateFilter && activeDateFilter !== "all");
};
```

### Arquivo: `src/components/dashboard/TodaysTasks.tsx`

```text
Mudanças:
1. Adicionar helper para verificar se tarefa foi concluída hoje
2. Filtrar grupo "completed" para mostrar apenas concluídas hoje
3. Atualizar label de "Concluídas" para "Concluídas hoje"

Lógica:
const wasCompletedToday = (task) => {
  if (!task.completed_at) return false;
  const completedDate = task.completed_at.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const today = format(new Date(), "yyyy-MM-dd");
  return completedDate === today;
};

const groupedTasks = {
  // ... outros grupos
  completed: tasks.filter((t) => t.completed && wasCompletedToday(t)),
};
```

---

## Comportamento Esperado Após Implementação

| Cenário | Antes | Depois |
|---------|-------|--------|
| Aba Time, filtro "Hoje" | Só tarefas pendentes | Pendentes + concluídas hoje |
| Aba Time, sem filtro | Só pendentes (ou todas se clicar botão) | Mantém igual |
| Dashboard "Concluídas" | Todas as concluídas históricas | Apenas concluídas hoje |
| Tarefa recorrente concluída | Some da tela | Aparece como concluída do dia |

---

## Arquivos a Modificar

1. `src/pages/Tarefas.tsx` - Passar prop do filtro
2. `src/components/tasks/TasksByPersonView.tsx` - Lógica de exibição automática
3. `src/components/dashboard/TodaysTasks.tsx` - Filtrar por data de conclusão

