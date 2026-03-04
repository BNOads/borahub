

## Plano: Corrigir Comissões de Cartão de Crédito Parcelado

### Problema Identificado

Quando o comprador paga com **cartão de crédito parcelado** (ex: 12x), a Hotmart repassa o valor **integral** ao produtor. O parcelamento é entre o comprador e a operadora do cartão. Porém, o sistema está tratando essas vendas como se o produtor recebesse parcelado (como boleto parcelado ou recorrência), dividindo a comissão em N parcelas.

**Regra correta:**
- **Cartão de crédito** (normal, mesmo parcelado): recebimento integral → 1 parcela, comissão integral
- **Boleto parcelado / Recorrência**: recebimento parcelado → N parcelas, comissão parcelada

### Como diferenciar na API Hotmart

O campo `purchase.payment.type` retorna valores como `"CREDIT_CARD"`, `"BILLET"`, etc. Combinado com `is_subscription` e `recurrency_number`, podemos determinar:

- Se `payment.type === "CREDIT_CARD"` **e** `is_subscription !== true` **e** `recurrency_number <= 1` → **pagamento integral** (ignorar `installments_number`, tratar como 1 parcela)
- Caso contrário (boleto, recorrência, assinatura) → manter lógica atual de parcelas

### Mudanças

#### 1. Edge Function `hotmart-sync/index.ts`

Criar uma função helper `isFullPayment(sale)` que retorna `true` quando o produtor recebe integral:

```text
function isFullPayment(sale):
  paymentType = sale.purchase.payment.type
  isSubscription = sale.purchase.is_subscription
  recurrencyNumber = sale.purchase.recurrency_number

  if paymentType == "CREDIT_CARD" AND !isSubscription AND recurrencyNumber <= 1:
    return true  // cartão normal, recebemos integral
  return false
```

Aplicar em **todos os 4 fluxos** que criam/atualizam parcelas:
- `sync_sales` (sync manual)
- `scheduled_sync` (sync automático)
- `sync_installments`
- Sync de installments dentro do scheduled_sync

Quando `isFullPayment = true`:
- `installments_count = 1` (independente do que a Hotmart reportar)
- Criar apenas 1 parcela com o valor total
- Comissão sobre valor integral

#### 2. Corrigir vendas existentes afetadas

Após o deploy da edge function, executar uma migração SQL para:
- Identificar vendas com `payment_type = 'CREDIT_CARD'` e `installments_count > 1` que NÃO são recorrentes
- Consolidar suas parcelas em 1 parcela única com valor total
- Atualizar comissões associadas para refletir o valor integral
- Atualizar `installments_count = 1` na tabela `sales`

Os 5 casos citados (HP3594527991, HP2530510103, HP0978817789, HP2703034665, HP2233482308) serão corrigidos automaticamente por essa migração.

### Detalhes técnicos

**Locais de modificação no `hotmart-sync/index.ts`:**
- Linhas ~764: `sync_sales` - onde define `installments_count`
- Linhas ~799-827: `sync_sales` - criação de parcelas para venda existente
- Linhas ~840-868: `sync_sales` - criação de parcelas para venda nova
- Linhas ~973: `scheduled_sync` - onde define `installments_count`
- Linhas ~1006-1045: `scheduled_sync` - atualização de parcelas existentes
- Linhas ~1057-1078: `scheduled_sync` - criação de parcelas novas
- Linhas ~1097-1158: `scheduled_sync` - sync de installments de vendas existentes
- Linhas ~603-711: `sync_installments` - precisa considerar `payment_type` do sale

**Migração SQL para correção:**
```sql
-- Consolidar parcelas de vendas cartão crédito normal (não recorrente)
-- 1. Deletar parcelas extras (installment_number > 1) e comissões associadas
-- 2. Atualizar parcela 1 com valor total
-- 3. Atualizar sales.installments_count = 1
```

