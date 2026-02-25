

# Plano: Lead Scoring + Badge de Qualificação

## Contexto

Os leads possuem nos campos `extra_data` os valores de **faturamento**, **lucro** e **empreita** como textos descritivos (ex: "Entre R$15.000,00 e R$30.000,00 mensal", "Não", "Sim"). Já existem os campos `is_qualified` e `qualification_score` na tabela `strategic_leads`, mas estão todos `false`/`null`.

## Regras de Lead Scoring

Mapear as faixas textuais para pontuações numéricas:

```text
FATURAMENTO (peso principal — fator qualificante: >= 15k)
  Até R$3.000        → 0 pts
  R$3k - R$5k        → 5 pts
  R$5k - R$10k       → 10 pts
  R$10k - R$15k      → 15 pts
  R$15k - R$30k      → 25 pts  ← a partir daqui qualifica
  R$30k - R$50k      → 35 pts
  R$50k - R$100k     → 45 pts
  Acima de R$100k     → 60 pts

LUCRO (fator qualificante: >= 10k)
  Até R$3.000        → 0 pts
  R$3k - R$5k        → 5 pts
  R$5k - R$10k       → 10 pts
  R$10k - R$15k      → 20 pts  ← a partir daqui qualifica
  R$15k - R$30k      → 25 pts
  R$30k - R$50k      → 35 pts
  R$50k - R$100k     → 45 pts
  Acima de R$100k     → 60 pts

EMPREITA (bônus, não determinante)
  "Não"              → +10 pts (bônus)
  "Sim" / outro      → 0 pts

QUALIFICAÇÃO:
  is_qualified = TRUE quando:
    faturamento >= 15k E lucro >= 10k
  
  qualification_score = soma dos pontos
```

## Alterações

### 1. Função de scoring no frontend (`CRMTab.tsx`)

Criar uma função `computeLeadScore(lead)` que:
- Lê `extra_data.faturamento`, `extra_data.lucro`, `extra_data.empreita`
- Normaliza o texto (trim, lowercase) e faz matching por substring nas faixas conhecidas
- Retorna `{ score: number, isQualified: boolean, breakdown: { faturamento, lucro, empreita } }`

### 2. Badge de qualificação nos cards do Kanban

No componente `DraggableLeadCard`:
- Remover a estrela dourada atual
- Adicionar badge **verde** "Qualificado" ou **vermelha** "Desqualificado" baseada no scoring calculado
- Exibir o score numérico ao lado

### 3. Detalhes do lead (Sheet lateral)

Na Sheet de detalhes:
- Substituir a badge atual de qualificado pela nova com cor
- Adicionar seção "Lead Scoring" com breakdown:
  - Faturamento: X pts
  - Lucro: X pts
  - Empreita: X pts
  - Total: X pts
  - Status: Qualificado/Desqualificado

### 4. Atualizar `is_qualified` e `qualification_score` no banco

Quando o scoring é calculado no CRM (ao carregar os leads), chamar `updateLead` em batch ou sob demanda para persistir `is_qualified` e `qualification_score` no banco, permitindo que filtros e dashboard usem os valores corretos.

Alternativa mais performática: calcular o scoring apenas no frontend para exibição e persistir apenas quando o lead é visualizado individualmente (evita updates em massa a cada render).

### 5. Filtro por qualificação

O filtro "Qualificado" já existe nos filtros dinâmicos. Ele continuará funcionando baseado no campo `is_qualified` do banco. Adicionarei um botão "Recalcular Scoring" na aba de Configuração que aplica o scoring a todos os leads e persiste os resultados.

## Detalhes Técnicos

- A função de parsing dos valores textuais usará matching por substrings-chave (`"15.000"`, `"30.000"`, `"100.000"`, etc.) para lidar com variações de formatação
- O scoring é computado no frontend via `useMemo` para performance
- A persistência em lote será feita via um botão explícito para não sobrecarregar requests

## Arquivos a serem modificados

- `src/components/strategic/CRMTab.tsx` — scoring, badges, breakdown no detalhe
- `src/components/strategic/ConfigTab.tsx` — botão "Recalcular Lead Scoring"
- `src/hooks/useStrategicSession.ts` — mutation para atualização em batch do scoring

