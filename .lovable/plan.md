
# Pagina de Reunioes - Sistema Google Docs-like

Criacao de uma pagina completa de reunioes que funciona como um editor de documentos colaborativo, permitindo anotar assuntos por blocos e converter topicos em tarefas atribuidas.

---

## Visao Geral

A pagina de Reunioes sera uma central para documentar reunioes da equipe. Cada reuniao tera blocos de anotacoes (como um Google Docs) e a partir de qualquer bloco sera possivel criar tarefas para membros da equipe, mantendo o vinculo com a reuniao de origem.

```text
+-----------------------------------------------+
|  Header: Arquivo de Reunioes             [+]  |
+-----------------------------------------------+
|  Lista de Reunioes    |   Editor da Reuniao   |
|  - Reuniao 1          |   Titulo: Weekly      |
|  - Reuniao 2 (nova)   |   Data: 29/01/2026    |
|  - Reuniao 3          |                       |
|                       |   [Bloco 1] + [Tarefa]|
|                       |   Texto do assunto... |
|                       |                       |
|                       |   [Bloco 2] + [Tarefa]|
|                       |   Outro topico...     |
|                       |                       |
|                       |   [+ Novo Bloco]      |
+-----------------------------------------------+
```

---

## Funcionalidades Principais

### 1. Listagem de Reunioes
- Lista lateral com todas as reunioes ordenadas por data
- Busca por titulo
- Filtro por data (mes/ano)
- Botao para criar nova reuniao

### 2. Editor de Reuniao
- Titulo editavel inline
- Data e hora da reuniao
- Participantes (opcional)
- Blocos de conteudo draggable

### 3. Blocos de Notas
- Cada bloco e um topico/assunto
- Texto livre com formatacao basica
- Drag and drop para reordenar
- Botao de converter em tarefa em cada bloco

### 4. Conversao para Tarefa
- Ao clicar em "+" no bloco, abre modal
- Seleciona responsavel
- Define data de vencimento
- Define recorrencia (opcional)
- Titulo da tarefa vem do bloco com prefixo da reuniao

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/ReunioesView.tsx` | Pagina principal com lista e editor |
| `src/components/reunioes/MeetingList.tsx` | Lista lateral de reunioes |
| `src/components/reunioes/MeetingEditor.tsx` | Editor principal da reuniao |
| `src/components/reunioes/MeetingBlock.tsx` | Bloco individual de anotacao |
| `src/components/reunioes/CreateMeetingModal.tsx` | Modal para criar reuniao |
| `src/components/reunioes/ConvertBlockToTaskModal.tsx` | Modal para converter bloco em tarefa |
| `src/hooks/useMeetings.ts` | Hook para CRUD de reunioes |
| `src/hooks/useMeetingBlocks.ts` | Hook para CRUD de blocos |

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/App.tsx` | Trocar Placeholder por ReunioesView na rota |

---

## Estrutura do Banco de Dados

### Tabela `meetings`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Identificador unico |
| title | TEXT | Titulo da reuniao |
| meeting_date | DATE | Data da reuniao |
| meeting_time | TIME | Hora da reuniao (opcional) |
| participants | TEXT[] | Lista de participantes |
| created_by | UUID | Usuario que criou |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Ultima atualizacao |

### Tabela `meeting_blocks`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Identificador unico |
| meeting_id | UUID | FK para meetings |
| content | TEXT | Conteudo do bloco |
| order_index | INTEGER | Ordem do bloco |
| linked_task_id | UUID | FK para tasks (se convertido) |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Ultima atualizacao |

### RLS Policies

Usuarios autenticados podem ler todas as reunioes (transparencia de equipe) e gerenciar as proprias. Admins podem gerenciar todas.

---

## Detalhes Tecnicos

### Hook useMeetings

```typescript
// Funcionalidades:
// - useMeetings(filters?): lista reunioes com filtros
// - useMeeting(id): busca reuniao especifica com blocos
// - useCreateMeeting(): cria nova reuniao
// - useUpdateMeeting(): atualiza reuniao
// - useDeleteMeeting(): remove reuniao
```

### Hook useMeetingBlocks

```typescript
// Funcionalidades:
// - useCreateBlock(): adiciona bloco
// - useUpdateBlock(): atualiza conteudo
// - useDeleteBlock(): remove bloco
// - useReorderBlocks(): reordena blocos via drag and drop
```

### Componente MeetingBlock

```typescript
// Caracteristicas:
// - Textarea auto-expandivel
// - Salvamento automatico com debounce (1.5s)
// - Indicador de tarefa vinculada
// - Botao de converter em tarefa
// - Handle para drag and drop (@dnd-kit ja instalado)
```

### Componente MeetingEditor

```typescript
// Caracteristicas:
// - Titulo editavel inline (click para editar)
// - Seletor de data/hora
// - Lista de blocos com DnD
// - Botao "Novo bloco" no final
// - Auto-save de todos os campos
```

---

## Fluxo de Uso

1. Usuario acessa /reunioes
2. Ve lista de reunioes existentes (ou vazia)
3. Clica em "+ Nova Reuniao"
4. Define titulo e data
5. Comeca a adicionar blocos de notas
6. A cada topico discutido, pode converter em tarefa
7. Tarefas criadas aparecem para os responsaveis
8. Reuniao fica arquivada para consulta futura

---

## UX/UI

- Layout em 2 colunas (desktop) / empilhado (mobile)
- Lista lateral colapsavel no mobile
- Blocos com visual de cards
- Animacao suave ao adicionar/reordenar blocos
- Indicador visual quando bloco tem tarefa vinculada
- Cores consistentes com o restante do sistema

---

## Ordem de Implementacao

1. Criar tabelas `meetings` e `meeting_blocks` no banco
2. Criar hooks `useMeetings.ts` e `useMeetingBlocks.ts`
3. Criar componente `MeetingBlock.tsx`
4. Criar componente `MeetingEditor.tsx`
5. Criar componente `MeetingList.tsx`
6. Criar modal `CreateMeetingModal.tsx`
7. Criar modal `ConvertBlockToTaskModal.tsx`
8. Criar pagina `ReunioesView.tsx`
9. Atualizar rota no `App.tsx`
10. Testar fluxo completo
