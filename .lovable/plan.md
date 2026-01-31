
# Plano: Aprimoramento do Validador de Copy - Estilo "Rafa + Alex"

## Resumo

Vamos aprimorar significativamente a IA do validador de copy para alinhar 100% com a metodologia BORAnaOBRA, incluindo novos critérios de avaliação, checklist negativo, e uma estrutura de output mais completa.

---

## Mudanças Principais

### 1. Nova Dimensão: "Metáforas de Obra"
Adicionar uma nova dimensão de avaliação específica para metáforas do universo da construção civil:
- Avaliar uso de analogias de obra, projeto, fundação, execução
- Verificar se metáforas sustentam o raciocínio ou são apenas decorativas
- Critério de nota: 0 (nenhuma), 5 (genérica), 10 (estrutural)

### 2. Refinamento da Dimensão "Tom e Voz"
Diferenciar empatia de "acolhimento mole":
- Empatia **com direção** (acolhe a dor mas conduz para decisão)
- Nunca valida a permanência no erro
- Não parece "colo" ou motivacional vazio

### 3. Novo Checklist Negativo: "Sinais de Alerta"
Adicionar verificação explícita de frases que **não são BORAnaOBRA**:
- Parece motivacional sem método
- Promete resultado sem custo ou escolha
- Trata o leitor como vítima do mercado
- Frases genéricas que servem para qualquer nicho
- Poderia ser dita por um "guru genérico"

### 4. Estrutura Invisível Refinada
Atualizar para incluir o elemento de **consequência**:
1. Espelhar a dor real sem dramatizar
2. Nomear o problema como falta de **método**, não de esforço
3. Quebrar a crença operacional errada
4. **Mostrar a consequência prática de não decidir** (novo)
5. Apresentar o método como proteção e clareza
6. Convidar para decisão consciente
7. Devolver responsabilidade sem agressividade

### 5. Urgência por "Custo Invisível"
Aprimorar critério de urgência para focar em:
- Custo acumulado da indecisão
- "Juros" emocionais e financeiros
- Retrabalho futuro
- Tempo perdido que não volta
- Evitar: contagem regressiva vazia, pressão emocional artificial

### 6. Novo Output: Ajuste Prioritário + Exemplo Reescrito
Adicionar ao resultado da validação:
- **Ajuste prioritário único**: O problema mais crítico a resolver primeiro
- **Frase exemplo reescrita**: Uma frase do texto original reescrita no tom BORA

---

## Detalhes Técnicos

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/validate-copy/index.ts` | Atualizar prompt completo + nova estrutura de output |
| `supabase/functions/rewrite-copy/index.ts` | Adicionar metáforas e novo tom ao prompt |
| `src/components/copy-validator/types.ts` | Adicionar novos campos ao tipo ValidationResult |
| `src/components/copy-validator/ValidationResults.tsx` | Exibir ajuste prioritário e exemplo reescrito |

### Atualização do System Prompt (validate-copy)

O prompt será reestruturado com as seguintes seções:

```text
## METÁFORAS OBRIGATÓRIAS (quando aplicável)
O texto deve, sempre que possível:
- Usar metáforas de obra, projeto, fundação, execução ou detalhe
- Mostrar causa e consequência como em uma obra mal planejada
- Traduzir abstrações em situações concretas do canteiro ou da gestão

Critério de nota:
- 0 se não houver nenhuma analogia concreta
- 5 se houver analogia genérica
- 10 se a metáfora sustentar o raciocínio inteiro

## TOM E VOZ (refinado)
- Empatia COM DIREÇÃO: acolhe a dor, mas conduz para decisão
- Nunca valida a permanência no erro
- Não parece "colo" motivacional

## SINAIS DE ALERTA | NÃO É BORAnaOBRA SE O TEXTO:
- Parece motivacional sem método
- Promete resultado sem custo ou escolha
- Trata o leitor como vítima do mercado
- Usa frases que poderiam servir para qualquer nicho
- Poderia ser dita por um guru genérico

## ESTRUTURA INVISÍVEL ESPERADA
1. Espelhar a dor real sem dramatizar
2. Nomear o problema como falta de método, não de esforço
3. Quebrar a crença operacional errada
4. Mostrar a consequência prática de não decidir
5. Apresentar o método como proteção e clareza
6. Convidar para uma decisão consciente
7. Devolver responsabilidade sem agressividade

## URGÊNCIA BORAnaOBRA
Baseada em:
- Custo acumulado da indecisão
- Juros emocionais e financeiros
- Retrabalho futuro
- Tempo perdido que não volta

Evitar:
- Contagem regressiva vazia
- Pressão emocional artificial
```

### Nova Estrutura de Dimensões (9 dimensões)

1. Tom e Voz (18%)
2. Metáforas de Obra (12%) — **NOVA**
3. Emoções Trabalhadas (12%)
4. Estrutura Invisível (18%)
5. Restrições de Linguagem (15%)
6. Português e Gramática (10%)
7. Prova Social (5%, ou N/A)
8. Urgência (5%, ou N/A)
9. Formato e Legibilidade (5%)

### Novos Campos no Output

```typescript
interface ValidationResult {
  // ... campos existentes ...
  ajuste_prioritario: string;      // Problema mais crítico a resolver
  exemplo_reescrito: {
    original: string;
    reescrito: string;
  };
  sinais_alerta: string[];         // Lista de sinais de alerta encontrados
}
```

### UI: Exibição dos Novos Campos

No `ValidationResults.tsx`, adicionar:
- Card destacado com o "Ajuste Prioritário" logo após o resumo executivo
- Seção "Exemplo de Correção" mostrando antes/depois
- Badge de "Sinais de Alerta" se houver (exibido como avisos críticos)

---

## Resumo Visual da Nova Avaliação

```text
┌─────────────────────────────────────────┐
│          NOTA GERAL: 72/100             │
│        Status: Necessita Revisão        │
├─────────────────────────────────────────┤
│ 🎯 AJUSTE PRIORITÁRIO                   │
│ "Incluir metáfora de fundação para      │
│  sustentar o argumento principal"       │
├─────────────────────────────────────────┤
│ ✏️ EXEMPLO REESCRITO                    │
│ Original: "Você precisa agir agora"     │
│ BORA: "Quem adia decisão paga duas      │
│        vezes — uma no retrabalho,       │
│        outra no tempo perdido"          │
├─────────────────────────────────────────┤
│ AVALIAÇÃO POR DIMENSÃO                  │
│ • Tom e Voz: 78                         │
│ • Metáforas de Obra: 45 ⚠️              │
│ • Estrutura Invisível: 82               │
│ • [...]                                 │
├─────────────────────────────────────────┤
│ ⚠️ SINAIS DE ALERTA                     │
│ • Frase genérica que serve qualquer     │
│   nicho: "Transforme sua vida"          │
└─────────────────────────────────────────┘
```

---

## Ordem de Implementação

1. Atualizar types.ts com novos campos
2. Atualizar edge function validate-copy com prompt aprimorado
3. Atualizar edge function rewrite-copy com novas diretrizes
4. Atualizar ValidationResults.tsx para exibir novos campos
5. Testar end-to-end

