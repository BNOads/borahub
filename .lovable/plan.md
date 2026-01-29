
# Plano: Criar Tarefas em Massa (Simplificado)

## Visao Geral
Adicionar funcionalidade para criar multiplas tarefas de uma vez com uma interface simples: o usuario define 1 responsavel, 1 prazo, e escreve varios titulos (1 por linha). Cada linha vira uma tarefa separada.

## Experiencia do Usuario

### Fluxo
1. Admin clica no botao "Criar em Massa" (ao lado do "Nova Tarefa")
2. Modal abre com:
   - Select de responsavel (obrigatorio)
   - Input de data de entrega (obrigatorio)
   - Textarea grande para digitar titulos (1 por linha)
3. Usuario clica em "Criar X tarefas"
4. Sistema cria todas as tarefas e fecha o modal

### Interface do Modal

```text
+-----------------------------------------------+
|  Criar Tarefas em Massa                   [X] |
+-----------------------------------------------+
|                                               |
|  Responsavel *          Data de entrega *     |
|  [Select usuario ▼]     [____/____/____]      |
|                                               |
|  Titulos das tarefas (1 por linha) *          |
|  +-------------------------------------------+|
|  | Revisar copy do email                     ||
|  | Aprovar banner do Instagram               ||
|  | Validar link de pagamento                 ||
|  | Conferir automacao de emails              ||
|  |                                           ||
|  +-------------------------------------------+|
|                                               |
|  4 tarefas serao criadas                      |
|                                               |
+-----------------------------------------------+
|                   [Cancelar]  [Criar 4 tarefas]|
+-----------------------------------------------+
```

## Arquivos a Criar

### src/components/tasks/BulkTaskModal.tsx
Modal com os campos:
- Select de responsavel (reutiliza query de usuarios existente)
- Input de data de entrega
- Textarea para multiplos titulos
- Contador de linhas validas (nao vazias)
- Botao de criar com contagem dinamica

## Arquivos a Modificar

### src/hooks/useTasks.ts
Adicionar hook `useCreateBulkTasks` para inserir array de tarefas:
- Recebe array de `TaskInsert[]`
- Insere todas de uma vez via Supabase
- Invalida queries apos sucesso
- Envia notificacao unica para o responsavel

### src/pages/Tarefas.tsx
- Importar e renderizar `BulkTaskModal`
- Adicionar state para controlar abertura do modal
- Adicionar botao "Criar em Massa" ao lado do botao existente (visivel apenas para admins)

## Detalhes Tecnicos

### Logica de Parse dos Titulos
```typescript
const titles = textareaContent
  .split("\n")
  .map(line => line.trim())
  .filter(line => line.length > 0);
```

### Estrutura do Hook
```typescript
export function useCreateBulkTasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tasks: TaskInsert[]) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert(tasks)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
      queryClient.invalidateQueries({ queryKey: ["tasks", "user"] });
    },
  });
}
```

### Criacao das Tarefas
Ao submeter, transforma cada titulo em um objeto TaskInsert:
```typescript
const tasksToCreate = titles.map(title => ({
  title,
  assignee: selectedAssignee,
  due_date: selectedDueDate,
  priority: "media" as const, // padrao
  completed: false,
  position: 0,
}));
```

### Notificacao
Apos criar, envia uma unica notificacao ao responsavel:
- Titulo: "X novas tarefas atribuidas"
- Mensagem: Lista dos primeiros 3 titulos + "e mais X"

## Validacoes
- Responsavel obrigatorio
- Data de entrega obrigatoria
- Pelo menos 1 titulo valido (linha nao vazia)
- Limite maximo de 50 tarefas por vez
- Feedback de erro se campos obrigatorios nao preenchidos

## Resumo das Alteracoes

| Tipo | Arquivo | Descricao |
|------|---------|-----------|
| Criar | `src/components/tasks/BulkTaskModal.tsx` | Modal completo para criacao em massa |
| Editar | `src/hooks/useTasks.ts` | Adicionar hook useCreateBulkTasks |
| Editar | `src/pages/Tarefas.tsx` | Adicionar botao e integrar modal |
