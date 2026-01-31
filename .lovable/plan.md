

# Plano: Agente de Copy - Gerador de Copies com IA

## Resumo

Criar uma nova ferramenta dentro do sistema que permite **gerar copies do zero** usando a mesma IA do validador (metodologia BORAnaOBRA "Rafa + Alex"). O sistema será contextualizado com base no funil, produto e etapa selecionados.

---

## Funcionalidades

### 1. Seleção de Contexto
- **Funil**: Dropdown com funis ativos (nome + categoria)
- **Produto**: Dropdown com produtos vinculados ao funil selecionado
- **Etapa do Funil**: Seletor com opções como:
  - Aquecimento
  - Captação
  - CPL/Conteúdo
  - Evento/Aula
  - Abertura de Carrinho
  - Carrinho Aberto
  - Fechamento
  - Pós-venda

### 2. Tipo de Copy
**Uma copy ou cronograma:**
- **Copy única**: Gera apenas 1 copy
- **Cronograma**: Define quantidade de dias + horários específicos para cada copy

**Canal(is) de distribuição (múltipla seleção):**
- E-mail
- WhatsApp Grupos
- WhatsApp 1x1
- SMS
- Áudios (roteiro)
- Conteúdo (posts/stories)

### 3. Geração com IA
- Usa o prompt completo do estilo "Rafa + Alex"
- Adapta formato automaticamente por canal:
  - **E-mail**: Assunto + corpo completo
  - **WhatsApp Grupos**: Texto curto + CTA direto
  - **WhatsApp 1x1**: Tom pessoal, conversacional
  - **SMS**: Limite de 160 caracteres
  - **Áudios**: Roteiro coloquial para gravação
  - **Conteúdo**: Legenda + hashtags

### 4. Banco de Copies
Nova tabela para salvar todas as copies geradas:
- Nome da copy
- Autor
- Tag(s)
- Funil correspondente
- Canal
- Conteúdo
- Data de criação

---

## Arquivos a Criar/Modificar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/copy-agent/CopyAgentView.tsx` | Novo | Interface principal do gerador |
| `src/components/copy-agent/CopyGeneratorModal.tsx` | Novo | Modal com formulário completo |
| `src/components/copy-agent/CopyScheduleConfig.tsx` | Novo | Configuração de cronograma (dias/horários) |
| `src/components/copy-agent/GeneratedCopyCard.tsx` | Novo | Card para exibir copy gerada |
| `src/components/copy-agent/CopyBankList.tsx` | Novo | Lista de copies salvas (banco) |
| `src/hooks/useCopyBank.ts` | Novo | Hook para CRUD do banco de copies |
| `supabase/functions/generate-copy/index.ts` | Novo | Edge function para geração |
| Migração SQL | Novo | Tabela `copy_bank` |

---

## Estrutura de Banco de Dados

### Nova Tabela: `copy_bank`

```text
id              UUID PRIMARY KEY
name            TEXT NOT NULL (nome da copy)
author_id       UUID (referência ao usuário)
author_name     TEXT (nome do autor)
funnel_id       UUID (referência ao funil, nullable)
funnel_name     TEXT (nome do funil para histórico)
product_name    TEXT (nome do produto)
funnel_stage    TEXT (etapa: aquecimento, captacao, etc)
channel         TEXT (email, whatsapp_grupos, whatsapp_1x1, sms, audio, conteudo)
tags            TEXT[] (array de tags)
content         TEXT NOT NULL (a copy gerada)
scheduled_for   TIMESTAMP (se for parte de cronograma)
created_at      TIMESTAMP DEFAULT now()
```

---

## Fluxo da Interface

```text
┌─────────────────────────────────────────────────────────────┐
│  AGENTE DE COPY                                     [+ Nova]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ CONFIGURAÇÃO ─────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  Funil:    [Dropdown: Lançamento MBA 2025 ▼]          │ │
│  │  Produto:  [Dropdown: MBA Gestão Obra ▼]              │ │
│  │  Etapa:    [Dropdown: Abertura de Carrinho ▼]         │ │
│  │                                                        │ │
│  │  Tipo:     ○ Copy Única   ● Cronograma                │ │
│  │                                                        │ │
│  │  [Se Cronograma]                                       │ │
│  │  ┌──────────────────────────────────────────┐         │ │
│  │  │ Dia 1 - 30/01  |  08:00  |  12:00  |     │         │ │
│  │  │ Dia 2 - 31/01  |  08:00  |  18:00  |     │         │ │
│  │  │ + Adicionar dia                          │         │ │
│  │  └──────────────────────────────────────────┘         │ │
│  │                                                        │ │
│  │  Canais:   ☑ E-mail  ☑ WhatsApp 1x1  ☐ SMS            │ │
│  │            ☐ WhatsApp Grupos  ☐ Áudio  ☐ Conteúdo     │ │
│  │                                                        │ │
│  │  Contexto adicional (opcional):                        │ │
│  │  [textarea: Ex: Foco em urgência de fechamento...]    │ │
│  │                                                        │ │
│  │            [Gerar Copies com IA]                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ COPIES GERADAS ───────────────────────────────────────┐ │
│  │                                                        │ │
│  │  ┌─ E-mail (30/01 08:00) ──────────────────────────┐  │ │
│  │  │ Assunto: Você está construindo ou apenas...     │  │ │
│  │  │ Corpo: [expandível]                              │  │ │
│  │  │        [Copiar] [Salvar no Banco] [Regenerar]   │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                        │ │
│  │  ┌─ WhatsApp 1x1 (30/01 12:00) ────────────────────┐  │ │
│  │  │ [conteúdo...]                                    │  │ │
│  │  │        [Copiar] [Salvar no Banco] [Regenerar]   │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ BANCO DE COPIES ──────────────────────────────────────┐ │
│  │  [Busca...]  [Filtro por funil ▼] [Filtro canal ▼]    │ │
│  │                                                        │ │
│  │  │ Nome      │ Funil    │ Canal  │ Etapa  │ Data    │ │ │
│  │  │───────────│──────────│────────│────────│─────────│ │ │
│  │  │ Copy Aqu1 │ MBA 2025 │ E-mail │ Aquec. │ 28/01   │ │ │
│  │  │ Copy Carr │ MBA 2025 │ WhatsA │ Carr.  │ 30/01   │ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Prompt da Edge Function

A edge function `generate-copy` usará o mesmo sistema de prompt do rewrite-copy, mas adaptado para CRIAR do zero:

```text
CONTEXTO DO FUNIL:
- Funil: [nome]
- Categoria: [lançamento/perpetuo/etc]
- Produto: [nome do produto]
- Etapa: [aquecimento/captacao/etc]
- Canal: [email/whatsapp/etc]

OBJETIVO:
Criar uma copy original que [objetivo baseado na etapa]

FORMATAÇÃO PARA [CANAL]:
[regras específicas do canal]
```

### Regras por Canal:

| Canal | Formatação |
|-------|------------|
| E-mail | Assunto (max 50 chars) + corpo estruturado |
| WhatsApp Grupos | Máx 1000 chars, CTAs claros, emojis moderados |
| WhatsApp 1x1 | Tom pessoal, como se falasse com amigo, curto |
| SMS | Máx 160 chars, CTA único, sem emoji |
| Áudio | Roteiro coloquial, pausas marcadas, 30-60s |
| Conteúdo | Legenda + 5-10 hashtags relevantes |

---

## Integração com Página de Conteúdo

O Agente de Copy será adicionado como uma nova aba/view dentro da página de Conteúdo (similar ao AgentesIAView), ou como item no menu lateral se preferido.

---

## Ordem de Implementação

1. Criar migração SQL para tabela `copy_bank`
2. Criar hook `useCopyBank.ts`
3. Criar edge function `generate-copy`
4. Criar componentes de UI:
   - `CopyAgentView.tsx` (container principal)
   - `CopyGeneratorModal.tsx` (formulário)
   - `CopyScheduleConfig.tsx` (cronograma)
   - `GeneratedCopyCard.tsx` (resultado)
   - `CopyBankList.tsx` (histórico)
5. Integrar na página de Conteúdo ou menu
6. Testar geração e salvamento

