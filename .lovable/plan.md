

# Plano: Melhorias na Ferramenta Mentoria BORA Acelerar

## Resumo das Correções e Melhorias

Este plano aborda 4 pontos principais:
1. Criar sub-aba de "Documentos Gerais" similar ao Guia de Sobrevivência
2. Tornar o botão "Replicar para Mentorado" mais evidente
3. Melhorar a visualização do Kanban para mentorados
4. Corrigir erros de drag-and-drop no Kanban

---

## 1. Correção do Kanban (Drag-and-Drop)

**Problema identificado**: 
- As colunas do Kanban não estão usando `useDroppable` para receber itens arrastados
- O componente `Badge` está recebendo ref mas não suporta `forwardRef`, causando warning no console

**Solução**:
- Refatorar `MentoriaKanban.tsx` para usar `useDroppable` em cada coluna (como feito em `SponsorKanban.tsx`)
- Separar a lógica de colunas em um componente `KanbanColumn` dedicado
- Adicionar `DragOverlay` para melhor feedback visual durante arraste
- Manter o Card como elemento principal que recebe o ref (já está correto)

---

## 2. Botão "Replicar para Mentorado" Mais Evidente

**Estado atual**: O botão está escondido no menu dropdown (3 pontinhos) de cada processo

**Solução**:
- Adicionar um botão destacado no cabeçalho do painel direito quando uma etapa está selecionada
- Usar estilo visual chamativo (cor primária, ícone de usuário)
- Manter a opção também no dropdown para acesso rápido

**Nova posição**: No header do Kanban, ao lado do nome da etapa

---

## 3. Visualização Diferenciada para Mentorados

**Melhoria**: Destacar visualmente as tarefas que pertencem a um mentorado específico

**Implementação**:
- Cards de tarefas com `mentorado_nome` recebem borda colorida destacada
- Badge do mentorado com cor mais vibrante (amber/gold)
- Opção de filtrar por mentorado no header do Kanban
- Contador visual de tarefas por mentorado

---

## 4. Sub-aba de Documentos Gerais

**Implementação**: Criar uma nova aba "Documentos" no painel principal, similar ao Guia de Sobrevivência

**Estrutura do banco de dados**:
- Reutilizar a tabela `documents` existente, adicionando um campo `mentoria_processo_id` (nullable)
- Documentos com esse campo preenchido aparecem apenas na mentoria
- OU criar uma nova tabela `mentoria_documentos` específica (mais isolado)

**Opção escolhida**: Nova tabela `mentoria_documentos` para manter separação clara

**Nova tabela**: `mentoria_documentos`
- `id` (UUID, PK)
- `processo_id` (UUID, FK -> mentoria_processos, nullable) - para docs gerais, deixar null
- `title` (text)
- `content` (text)
- `icon` (text, default '📄')
- `google_docs_url` (text, nullable)
- `is_favorite` (boolean, default false)
- `category` (text, nullable) - para pastas internas
- `created_at`, `updated_at`
- `created_by` (UUID)

---

## Componentes a Criar/Modificar

**Novos arquivos**:
- `src/components/mentoria/MentoriaDocumentos.tsx` - Componente de documentos (baseado no GuiaView)
- `src/components/mentoria/KanbanColumn.tsx` - Coluna individual do Kanban com useDroppable

**Arquivos a modificar**:
- `src/components/mentoria/MentoriaKanban.tsx` - Corrigir drag-and-drop, adicionar filtros
- `src/components/mentoria/MentoriaTaskCard.tsx` - Melhorar visual para mentorados
- `src/pages/MentoriaView.tsx` - Adicionar aba de documentos, botão de replicar destacado
- `src/hooks/useMentoria.ts` - Adicionar hooks para documentos

---

## Sequência de Implementação

1. **Migração de banco**: Criar tabela `mentoria_documentos` com políticas RLS
2. **Correção do Kanban**: 
   - Extrair `KanbanColumn` com `useDroppable`
   - Adicionar `DragOverlay`
   - Testar drag-and-drop entre colunas
3. **Visual de mentorados**:
   - Melhorar cards com borda colorida
   - Adicionar filtro por mentorado
4. **Botão de replicar**:
   - Adicionar botão destacado no header
5. **Aba de documentos**:
   - Criar `MentoriaDocumentos` baseado no GuiaView
   - Integrar na página principal

---

## Detalhes Técnicos

### Correção do Kanban (código-chave)

```typescript
// KanbanColumn com useDroppable
function KanbanColumn({ column, tarefas, ... }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border-2 p-3 transition-colors",
        column.color,
        isOver && "ring-2 ring-primary bg-primary/5"
      )}
    >
      ...
    </div>
  );
}
```

### Visual diferenciado para mentorados

```typescript
// No MentoriaTaskCard
<Card
  className={cn(
    "cursor-pointer hover:shadow-md transition-shadow",
    tarefa.mentorado_nome && "border-l-4 border-l-amber-500"
  )}
>
  {tarefa.mentorado_nome && (
    <Badge className="bg-amber-500/20 text-amber-700 border-amber-500">
      <User className="h-3 w-3 mr-1" />
      {tarefa.mentorado_nome}
    </Badge>
  )}
</Card>
```

### Botão de replicar destacado

```typescript
// No header do Kanban
<div className="flex items-center justify-between mb-4">
  <h2 className="text-lg font-semibold">{etapaName}</h2>
  <div className="flex items-center gap-2">
    <Button 
      onClick={onReplicarProcesso}
      className="bg-amber-500 hover:bg-amber-600 text-white"
    >
      <UserPlus className="h-4 w-4 mr-2" />
      Replicar para Mentorado
    </Button>
    <Button size="sm" onClick={onCreateTarefa}>
      <Plus className="h-4 w-4 mr-2" />
      Nova Tarefa
    </Button>
  </div>
</div>
```

---

## Interface Final Esperada

```
+--------------------------------+----------------------------------------+
|  SIDEBAR (Processos)           |  PAINEL PRINCIPAL                      |
+--------------------------------+----------------------------------------+
| [+ Novo Processo]              |  [Tarefas] [Documentos]                |
| [Buscar...]                    |                                        |
|                                |  Etapa: Processo Padrão                |
| ▼ Onboarding MBA 2025          |  [🔄 Replicar para Mentorado] [+ Nova] |
|   └ Processo Padrão ●          |                                        |
| ▼ Offboarding MBA2025          |  KANBAN:                               |
|   └ Processo Padrão            |  ┌──────────┐ ┌──────────┐ ┌──────────┐|
| ▼ Entrega Padrão               |  │ A Fazer  │ │Em Andamen│ │ Concluído│|
|   └ Pré-encontro               |  ├──────────┤ ├──────────┤ ├──────────┤|
|   └ Encontro                   |  │ [Task 1] │ │          │ │ [Task 3] │|
|                                |  │ [Task 2] │ │          │ │          │|
|                                |  │ ▌João▐   │ │          │ │          │|
|                                |  └──────────┘ └──────────┘ └──────────┘|
+--------------------------------+----------------------------------------+
```

**Legenda visual**:
- `▌João▐` = Badge colorido do mentorado
- Cards com borda lateral colorida = tarefas de mentorados

