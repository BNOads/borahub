

# Plano: Nova Ferramenta "Mentoria BORA Acelerar"

## Resumo
Criar uma nova ferramenta completa para gerenciar processos de mentoria, com visualização de documentos, gestão de tarefas via Kanban, e a capacidade de replicar processos padronizados para novos mentorados.

---

## Estrutura da Solução

### 1. Banco de Dados (3 novas tabelas)

**Tabela `mentoria_processos`** - Processos/templates reutilizáveis
- `id` (UUID, PK)
- `name` (text) - Nome do processo (ex: "Onboarding MBA 2025")
- `description` (text, nullable)
- `created_at`, `updated_at`
- `created_by` (UUID, ref profiles)

**Tabela `mentoria_etapas`** - Etapas dentro de cada processo
- `id` (UUID, PK)
- `processo_id` (UUID, FK -> mentoria_processos)
- `name` (text) - Nome da etapa (ex: "Processo Padrão", "Pré-encontro")
- `position` (int) - Ordem de exibição
- `created_at`

**Tabela `mentoria_tarefas`** - Tarefas dentro de cada etapa
- `id` (UUID, PK)
- `etapa_id` (UUID, FK -> mentoria_etapas)
- `title` (text)
- `description` (text, nullable)
- `position` (int)
- `completed` (boolean, default false)
- `mentorado_nome` (text, nullable) - Quando replicado para um mentorado específico
- `parent_tarefa_id` (UUID, nullable) - Referência ao template original
- `created_at`, `completed_at`

**Políticas RLS**: Leitura/escrita para todos os usuários autenticados.

---

### 2. Processos Iniciais (Dados de Seed)

Baseado nas imagens fornecidas, serão criados 2 processos principais:

**Processo 1: "Onboarding MBA 2025"**
- Etapa: Processo Padrão (17 tarefas)
  - Mensagem de boas-vindas
  - Gerar boletos
  - Gerar contrato
  - Incluir no grupo da mentoria
  - Inserir dados coletados na Planilha de Controle
  - Enviar acessos
  - Acompanhar assinatura do contrato até o fim
  - Criar pasta do mentorado
  - Inserir nas listas de transmissões
  - Notion: ajustar datas de desempenho mensal, cronômetro trimestral e enviar acesso
  - Criar grupo de suporte dedicado
  - Indicação
  - Programar call de boas-vindas e fazer trilha de aceleração

**Processo 2: "Offboarding MBA2025"**
- Etapa: Processo Padrão (10 tarefas)
  - Calcular o valor devido
  - Remover do grupo de WhatsApp geral da MBA
  - Remover acessos dos cursos da Hotmart
  - Remover acesso do Notion
  - Remover da Lista de Transmissão de WhatsApp
  - Remover da planilha de acompanhamento dos alunos
  - Grupo de suporte individual: remover participantes
  - Subir as informações do distrato no Clicksign e enviar para ser assinado
  - Informar aos envolvidos para assinarem o distrato
  - Gerar os boletos da rescisão

**Processo 3: "Entrega Padrão"**
- Etapa: Pré-encontro (3 tarefas)
- Etapa: Encontro (7 tarefas)
- Etapa: Recados finais (3 tarefas)
- Etapa: Extra encontros (10 tarefas)

---

### 3. Interface do Usuário

**Nova página: `/mentoria`**

Layout dividido em 2 painéis (similar ao Guia de Sobrevivência):

```
+---------------------------+--------------------------------+
|  SIDEBAR (Processos)      |  ÁREA PRINCIPAL                |
+---------------------------+--------------------------------+
| [+ Novo Processo]         |  Tabs: [Tarefas] [Documentos]  |
| [Buscar...]               |                                |
|                           |  KANBAN (quando Tarefas):      |
| ▼ Onboarding MBA 2025     |  [A Fazer] [Em Prog] [Feito]   |
|   └ Processo Padrão       |                                |
| ▼ Offboarding MBA2025     |  OU                            |
|   └ Processo Padrão       |                                |
| ▼ Entrega Padrão          |  DOCUMENTOS (quando Docs):     |
|   └ Pré-encontro          |  Lista de docs da mentoria     |
|   └ Encontro              |                                |
|   └ Recados finais        |                                |
|   └ Extra encontros       |                                |
+---------------------------+--------------------------------+
```

**Funcionalidades principais:**

1. **Visualização de Processos** (sidebar esquerda)
   - Lista colapsável de processos com suas etapas
   - Badge com contagem de tarefas por etapa
   - Busca por nome

2. **Replicar para Mentorado** (botão no topo do processo selecionado)
   - Modal: "Nome do mentorado"
   - Cria cópia de todas as tarefas do processo vinculadas ao mentorado
   - Tarefas copiadas aparecem com badge do nome do mentorado

3. **Kanban de Tarefas** (painel direito)
   - 3 colunas: "A Fazer", "Em Andamento", "Concluído"
   - Drag-and-drop entre colunas
   - Cards com título, descrição resumida, badge do mentorado
   - Checkbox para marcar como concluída

4. **Gestão de Processos**
   - Criar novo processo (nome + descrição)
   - Adicionar/remover etapas
   - Adicionar/editar/remover tarefas dentro das etapas
   - Reordenar itens via drag-and-drop

5. **Aba Documentos** (opcional)
   - Reutiliza lógica similar ao Guia de Sobrevivência
   - Documentos específicos da mentoria

---

### 4. Componentes a Criar

```
src/
├── pages/
│   └── MentoriaView.tsx              # Página principal
├── components/
│   └── mentoria/
│       ├── MentoriaProcessosList.tsx # Sidebar com lista de processos
│       ├── MentoriaKanban.tsx        # Kanban de tarefas
│       ├── MentoriaTaskCard.tsx      # Card de tarefa no Kanban
│       ├── CreateProcessoModal.tsx   # Modal criar/editar processo
│       ├── CreateEtapaModal.tsx      # Modal criar/editar etapa
│       ├── CreateTarefaModal.tsx     # Modal criar/editar tarefa
│       └── ReplicarProcessoModal.tsx # Modal para replicar processo
├── hooks/
│   └── useMentoria.ts                # Hooks para CRUD de mentoria
```

---

### 5. Roteamento

Adicionar em `App.tsx`:
```typescript
<Route path="/mentoria" element={<MentoriaView />} />
```

Adicionar em `AcessoRapido.tsx`:
```typescript
{
  name: "Mentoria BORA Acelerar",
  description: "Gerencie processos de mentoria e acompanhe mentorados",
  href: "/mentoria",
  icon: GraduationCap, // ou outro ícone apropriado
  color: "bg-yellow-500/10 text-yellow-500",
}
```

---

## Sequência de Implementação

1. **Banco de dados**: Criar tabelas e políticas RLS
2. **Hooks**: `useMentoria.ts` com queries e mutations
3. **Componentes base**: Modais de criação
4. **Sidebar**: Lista de processos com etapas colapsáveis
5. **Kanban**: Visualização e drag-and-drop de tarefas
6. **Replicação**: Modal e lógica para copiar processo para mentorado
7. **Dados iniciais**: Inserir os processos das imagens
8. **Integração**: Adicionar rota e link em Ferramentas

---

## Detalhes Técnicos

- Reutilizar `@dnd-kit` já instalado para Kanban
- Seguir padrões visuais do `GuiaView.tsx` para a sidebar
- Seguir padrões do `TaskKanban.tsx` para o Kanban
- Manter consistência com Tailwind classes existentes
- Usar `sonner` para toasts de feedback
- Queries com `@tanstack/react-query` seguindo padrão do projeto

