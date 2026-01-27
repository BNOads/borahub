
# Plano: Ferramenta Relatórios com IA

## Visão Geral

Este plano detalha a implementação do módulo **Relatórios** no BORA Hub - uma ferramenta nativa para consolidar dados da plataforma, gerar relatórios narrativos com IA, exportar PDFs e manter histórico persistente.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│  src/pages/RelatoriosView.tsx          ← Página principal           │
│  src/components/relatorios/            ← Componentes do módulo      │
│    ├── ReportHistory.tsx               ← Lista de relatórios salvos │
│    ├── CreateReportModal.tsx           ← Modal de criação           │
│    ├── ReportViewer.tsx                ← Visualização do relatório  │
│    ├── ReportSuggestions.tsx           ← Sugestões da IA            │
│    └── ReportPDFGenerator.tsx          ← Geração de PDF             │
│  src/hooks/useReports.ts               ← Hook de dados              │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Edge Function (Deno)                             │
├─────────────────────────────────────────────────────────────────────┤
│  supabase/functions/generate-report/index.ts                        │
│    ├── Consolida dados do período                                   │
│    ├── Chama Lovable AI (gemini-3-flash-preview)                    │
│    ├── Gera narrativa estruturada                                   │
│    └── Retorna relatório + sugestões                                │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Supabase Database                              │
├─────────────────────────────────────────────────────────────────────┤
│  reports                         ← Metadados dos relatórios         │
│  report_sections                 ← Seções/blocos do relatório       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Banco de Dados

### Tabela: `reports`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | Identificador único |
| title | text | Título do relatório |
| report_type | text | Tipo (semanal, evento, comercial, etc.) |
| period_start | date | Início do período analisado |
| period_end | date | Fim do período analisado |
| scope | jsonb | Escopo selecionado (eventos, funis, vendas, etc.) |
| filters | jsonb | Filtros aplicados (produto, time, responsável) |
| content_html | text | Conteúdo HTML renderizado |
| content_markdown | text | Conteúdo em Markdown |
| ai_suggestions | jsonb | Sugestões de novos relatórios |
| generated_by | uuid (FK) | Usuário que gerou |
| generated_at | timestamptz | Data de geração |
| status | text | Status (generating, completed, error) |
| pdf_path | text | Caminho do PDF no Storage (opcional) |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Última atualização |

### Políticas RLS

- Usuários autenticados podem visualizar relatórios
- Usuários autenticados podem criar relatórios
- Apenas o criador ou admins podem deletar relatórios

---

## Edge Function: `generate-report`

A edge function será responsável por:

1. **Receber parâmetros**: período, escopo, filtros
2. **Consolidar dados** de todas as tabelas relevantes:
   - `events` - Eventos do período
   - `funnels` + `funnel_checklist` - Funis e pendências
   - `sales` + `installments` - Vendas e faturamento
   - `tasks` - Tarefas por pessoa
   - `sponsors` - Patrocinadores
   - `bora_news` - Atualizações internas
3. **Montar prompt contextual** com os dados consolidados
4. **Chamar Lovable AI** (google/gemini-3-flash-preview)
5. **Estruturar resposta** em blocos temáticos
6. **Gerar sugestões** de relatórios adicionais
7. **Salvar no banco** e retornar resultado

### Estrutura do Prompt para IA

```text
Você é um analista de operações experiente do BORA Hub.
Gere um relatório executivo baseado nos dados fornecidos.

PERÍODO: [data_inicio] a [data_fim]
ESCOPO: [escopos_selecionados]

DADOS CONSOLIDADOS:
[dados_formatados_por_área]

ESTRUTURA DO RELATÓRIO:
1. Resumo Executivo (principais acontecimentos)
2. [Blocos temáticos baseados no escopo]
3. Alertas e Riscos
4. Próximos Passos com Responsáveis

REGRAS:
- Nunca invente números
- Se faltar dados, sinalize explicitamente
- Use tom profissional e objetivo
- Formate em Markdown com seções claras
```

---

## Componentes Frontend

### 1. `RelatoriosView.tsx` (Página Principal)

- Header com ícone e descrição
- Botão "Novo Relatório"
- Tabs ou filtros (tipo, período, autor)
- Lista de relatórios (ReportHistory)

### 2. `CreateReportModal.tsx`

- Seleção de período (date range picker)
- Checkboxes de escopo:
  - Eventos
  - Funis de marketing
  - Vendas e faturamento
  - Tarefas por pessoa
  - Patrocinadores
  - Conteúdo
- Filtros opcionais (produto, time, responsável)
- Botão "Gerar com IA" com loading state

### 3. `ReportViewer.tsx`

- Renderização do relatório em HTML/Markdown
- Botões: Baixar PDF, Gerar Variação
- Seção de sugestões da IA ao final
- Metadados (data, autor, período)

### 4. `ReportHistory.tsx`

- Tabela/cards com relatórios salvos
- Colunas: Título, Tipo, Período, Data, Autor, Ações
- Ações: Visualizar, Baixar PDF
- Filtros por tipo e período

### 5. `ReportSuggestions.tsx`

- Lista de sugestões contextuais
- Cada sugestão com:
  - Título do relatório sugerido
  - Descrição do valor
  - Botão "Gerar agora"

### 6. `ReportPDFGenerator.tsx`

- Utiliza jsPDF (já instalado)
- Gera PDF formatado com:
  - Capa com logo e título
  - Seções estruturadas
  - Rodapé "Gerado pelo BORA Hub"

---

## Navegação e Rotas

### Atualização em `AcessoRapido.tsx`

Adicionar novo item na lista de ferramentas:

```typescript
{
  name: "Relatórios",
  description: "Gere relatórios executivos com IA sobre sua operação",
  href: "/relatorios",
  icon: FileBarChart,
  color: "bg-indigo-500/10 text-indigo-500",
}
```

### Nova Rota em `App.tsx`

```typescript
<Route path="/relatorios" element={<RelatoriosView />} />
```

---

## Fluxo de Geração de Relatório

```text
1. Usuário clica "Novo Relatório"
           │
           ▼
2. Modal abre → seleciona período + escopo + filtros
           │
           ▼
3. Clica "Gerar com IA"
           │
           ▼
4. Frontend envia request para edge function
           │
           ▼
5. Edge function:
   a. Busca dados das tabelas relevantes
   b. Consolida em formato estruturado
   c. Envia para Lovable AI com prompt
   d. Recebe narrativa + sugestões
   e. Salva no banco (status: completed)
   f. Retorna ID do relatório
           │
           ▼
6. Frontend redireciona para visualização
           │
           ▼
7. Usuário pode baixar PDF ou gerar variação
```

---

## Tipos de Relatórios Suportados

| Tipo | Descrição | Escopos Principais |
|------|-----------|-------------------|
| `weekly` | Relatório Semanal | Todos |
| `event` | Relatório de Evento | Eventos, Funis |
| `commercial` | Relatório Comercial | Vendas, Comissões |
| `operational` | Relatório Operacional | Tarefas, Funis |
| `custom` | Relatório Personalizado | Seleção livre |

---

## Sugestões Automáticas da IA

Após cada geração, a IA retornará sugestões como:

- Relatório individual por colaborador
- Relatório de performance de eventos
- Relatório de gargalos operacionais
- Relatório de produtividade por time
- Relatório de vendas por produto
- Relatório de metas vs realizado
- Relatório de riscos da semana

Cada sugestão terá:
- `title`: Nome do relatório
- `description`: Valor que entrega
- `suggested_scope`: Escopos recomendados
- `suggested_period`: Período sugerido

---

## Detalhes Técnicos

### Hook `useReports.ts`

```typescript
// Queries
- useReports(filters) → lista relatórios com paginação
- useReport(id) → detalhes de um relatório
- useReportTypes() → tipos disponíveis

// Mutations
- useGenerateReport() → chama edge function
- useDeleteReport() → remove relatório
```

### Configuração Edge Function

Atualizar `supabase/config.toml`:

```toml
[functions.generate-report]
verify_jwt = true
```

### Integrações Necessárias

- **jsPDF**: já instalado, usar para gerar PDFs
- **date-fns**: já instalado, para formatação de datas
- **MarkdownRenderer**: já existe, usar para renderizar conteúdo

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/RelatoriosView.tsx` | Página principal do módulo |
| `src/components/relatorios/ReportHistory.tsx` | Lista de relatórios |
| `src/components/relatorios/CreateReportModal.tsx` | Modal de criação |
| `src/components/relatorios/ReportViewer.tsx` | Visualizador |
| `src/components/relatorios/ReportSuggestions.tsx` | Sugestões da IA |
| `src/hooks/useReports.ts` | Hook de dados |
| `supabase/functions/generate-report/index.ts` | Edge function |

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/App.tsx` | Adicionar rota `/relatorios` |
| `src/pages/AcessoRapido.tsx` | Adicionar card Relatórios |
| `supabase/config.toml` | Configurar edge function |

---

## MVP Obrigatório (Fase 1)

1. Tabela `reports` no banco
2. Edge function para geração com IA
3. Página principal com histórico
4. Modal de criação com seleção de período/escopo
5. Visualizador de relatório
6. Download de PDF
7. Sugestões de novos relatórios

## Fases Futuras

- Relatórios recorrentes automáticos (cron)
- Envio por email/WhatsApp
- Relatórios individuais por pessoa
- Comparativos entre períodos
- Templates customizáveis
- Armazenamento de PDF no Storage

---

## Considerações de Segurança

- RLS habilitado na tabela `reports`
- Edge function com `verify_jwt = true`
- Validação de permissões no backend
- Logs de geração para auditoria
