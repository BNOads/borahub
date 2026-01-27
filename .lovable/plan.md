
# Plano: Validador de Copy BORAnaOBRA

## Resumo

Criar uma ferramenta completa de validação de copy que analisa textos de marketing contra as diretrizes da marca BORAnaOBRA usando IA, fornecendo pontuação detalhada, feedback acionável e sugestões de reescrita.

---

## Arquitetura da Solução

A ferramenta será acessível via:
1. **Página dedicada** em `/validador-copy` 
2. **Aba integrada** na Gestão de Conteúdo (ConteudoView) para acesso rápido

```text
+---------------------------+
|      Frontend (React)     |
+---------------------------+
            |
            v
+---------------------------+
|    Edge Function          |
|  (validate-copy/index.ts) |
+---------------------------+
            |
            v
+---------------------------+
|   Lovable AI Gateway      |
|  (google/gemini-3-flash)  |
+---------------------------+
```

---

## Componentes a Criar

### 1. Página Principal
**Arquivo:** `src/pages/ValidadorCopy.tsx`

Interface com:
- Textarea para inserção da copy (limite 10.000 caracteres)
- Contador de caracteres em tempo real
- Botão "Validar Copy" com loading state
- Área de resultados com:
  - Score geral circular/gauge
  - Cards de dimensões com barras de progresso
  - Seções colapsáveis para feedback detalhado
  - Trechos problemáticos destacados
- Botões de ação: Copiar feedback, Revalidar

### 2. Componentes de UI
**Arquivos:**
- `src/components/copy-validator/ScoreDisplay.tsx` - Exibição visual do score (0-100)
- `src/components/copy-validator/DimensionCard.tsx` - Card de cada dimensão avaliada
- `src/components/copy-validator/ProblemHighlight.tsx` - Destaque de trechos problemáticos
- `src/components/copy-validator/ValidationResults.tsx` - Container dos resultados

### 3. Edge Function
**Arquivo:** `supabase/functions/validate-copy/index.ts`

Recebe o texto e retorna análise estruturada via JSON.

---

## Integração na Gestão de Conteúdo

Adicionar nova aba "Validador" na ConteudoView, seguindo o padrão existente das abas "Diretrizes" e "Agentes de IA".

---

## Fluxo de Dados

```text
1. Usuário cola/digita texto
2. Clica "Validar Copy"
3. Frontend envia POST para /functions/v1/validate-copy
4. Edge Function:
   a. Valida autenticação (opcional - JWT)
   b. Envia prompt estruturado para Lovable AI
   c. Recebe resposta JSON estruturada
   d. Retorna resultado para frontend
5. Frontend renderiza resultados interativos
```

---

## Detalhes Técnicos

### Estrutura do JSON de Resposta da IA

```typescript
interface ValidationResult {
  pontuacao_geral: number; // 0-100
  status: "Aprovado" | "Ajustes Recomendados" | "Necessita Revisão" | "Não Aprovado";
  dimensoes: Array<{
    nome: string;
    pontuacao: number;
    peso: number;
    status: "Ótimo" | "Atenção" | "Crítico";
    problemas: string[];
    sugestoes: string[];
    exemplo_bora?: string;
  }>;
  destaques_positivos: string[];
  trechos_problematicos: Array<{
    trecho_original: string;
    problema: string;
    sugestao_reescrita: string;
  }>;
  resumo_executivo: string;
}
```

### Dimensões de Avaliação (conforme PRD)

| Dimensão | Peso |
|----------|------|
| Tom e Voz | 20% |
| Emoções Trabalhadas | 15% |
| Estrutura Invisível | 20% |
| Restrições de Linguagem | 20% |
| Prova Social | 10% |
| Urgência | 10% |
| Formato e Legibilidade | 5% |

### Classificação Visual

| Score | Status | Cor |
|-------|--------|-----|
| 90-100 | Aprovado | Verde |
| 75-89 | Ajustes Recomendados | Amarelo |
| 60-74 | Necessita Revisão | Laranja |
| 0-59 | Não Aprovado | Vermelho |

---

## Arquivos a Criar/Modificar

### Criar:
1. `src/pages/ValidadorCopy.tsx` - Página principal
2. `src/components/copy-validator/ScoreDisplay.tsx` - Gauge de score
3. `src/components/copy-validator/DimensionCard.tsx` - Card de dimensão
4. `src/components/copy-validator/ProblemHighlight.tsx` - Destaque de problemas
5. `src/components/copy-validator/ValidationResults.tsx` - Container de resultados
6. `supabase/functions/validate-copy/index.ts` - Edge function

### Modificar:
1. `src/App.tsx` - Adicionar rota `/validador-copy`
2. `src/pages/AcessoRapido.tsx` - Adicionar card da ferramenta
3. `src/pages/ConteudoView.tsx` - Adicionar aba "Validador"
4. `supabase/config.toml` - Registrar nova function

---

## UI/UX

### Página Principal

```text
┌─────────────────────────────────────────────────────────┐
│  📝 Validador de Copy BORAnaOBRA                        │
│  Analise sua copy contra as diretrizes da marca         │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │  [Textarea: Cole sua copy aqui...]                  │ │
│ │                                                     │ │
│ │                                          3420/10000 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│              [ 🔍 Validar Copy ]                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  RESULTADOS                                             │
│ ┌───────────┐ ┌───────────────────────────────────────┐ │
│ │           │ │ Tom e Voz         ████████░░  80/100  │ │
│ │    85     │ │ Emoções           ██████████  95/100  │ │
│ │   /100    │ │ Estrutura         ██████░░░░  60/100  │ │
│ │           │ │ Linguagem         ████████░░  85/100  │ │
│ │ Ajustes   │ │ Prova Social      ██████████  100/100 │ │
│ │Recomendad│ │ Urgência          ████████░░  80/100  │ │
│ └───────────┘ │ Formato           ██████████  90/100  │ │
│               └───────────────────────────────────────┘ │
│                                                         │
│ ▼ Feedback Detalhado                                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ⚠️ Estrutura Invisível - 60/100                     │ │
│ │ Problemas: [lista]                                   │ │
│ │ Sugestões: [lista]                                   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ▼ Trechos Problemáticos                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ❌ "transformação digital garantida"                 │ │
│ │ Problema: Jargão de marketing                        │ │
│ │ Sugestão: "um caminho claro para estruturar..."     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [ 📋 Copiar Feedback ] [ 🔄 Nova Validação ]           │
└─────────────────────────────────────────────────────────┘
```

---

## Edge Function: Prompt System

O prompt completo do PRD será incorporado no `systemPrompt` da edge function, instruindo a IA a:

1. Avaliar as 7 dimensões com critérios específicos
2. Aplicar penalizações conforme as regras
3. Retornar JSON estruturado
4. Incluir exemplos BORAnaOBRA quando apropriado

---

## Considerações de Implementação

### Performance
- Timeout de 30 segundos para a edge function
- Loading state com mensagem animada durante processamento
- Tratamento de erros 429 (rate limit) e 402 (payment required)

### Acessibilidade
- Cores com contraste adequado para status
- Ícones com labels de acessibilidade
- Feedback visual claro do estado de validação

### Mobile
- Layout responsivo
- Textarea adaptativo
- Cards de resultado empilhados em mobile

---

## Ordem de Implementação

1. Criar edge function `validate-copy` com prompt do PRD
2. Criar tipos TypeScript para a resposta
3. Criar componentes de UI (ScoreDisplay, DimensionCard, etc)
4. Criar página ValidadorCopy
5. Adicionar rota no App.tsx
6. Adicionar card no AcessoRapido
7. Integrar como aba na ConteudoView
8. Testar e ajustar prompt baseado nos resultados
