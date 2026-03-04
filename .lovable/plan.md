

## Plano: Usar Preço Base do Produto (Sem Juros) para Vendas com Cartão de Crédito

### Problema

A API da Hotmart retorna em `purchase.price.value` o valor **com juros do cartão** quando o comprador parcela no crédito. Como o produtor recebe o valor base (sem juros), o sistema deve gravar o preço da oferta/produto, não o preço com juros.

### Solução

No `hotmart-sync/index.ts`, quando `isFullPayment(sale) === true` (cartão de crédito, não recorrente), buscar o preço base do produto na tabela `products` (já sincronizada via offers API da Hotmart) e usar esse valor ao invés de `purchase.price.value`.

### Mudanças — `supabase/functions/hotmart-sync/index.ts`

#### 1. Criar helper `getBaseProductPrice`

```text
async function getBaseProductPrice(supabase, productName, purchasePrice):
  // Buscar produto na tabela products pelo nome
  product = SELECT price FROM products WHERE name = productName
  if product exists AND product.price > 0:
    return product.price
  // Fallback: retornar o preço da compra se não encontrar o produto
  return purchasePrice
```

#### 2. Aplicar nos fluxos `sync_sales` e `scheduled_sync`

Em ambos os fluxos, após detectar `isFullPayment`, substituir:
- `total_value: sale.purchase.price.value` → `total_value: await getBaseProductPrice(supabase, sale.product.name, sale.purchase.price.value)`

Isso afeta:
- **sync_sales** (~linha 865): `total_value` no `saleData`
- **scheduled_sync** (~linha 1108): `total_value` no `saleData`

A lógica de parcelas (installments) e comissões já usa `saleData.total_value`, então automaticamente receberão o valor correto.

#### 3. Log para auditoria

Adicionar log quando o preço base for diferente do preço da compra:
```text
if basePrice !== purchasePrice:
  console.log(`Sale ${transaction}: Using base price ${basePrice} instead of purchase price ${purchasePrice} (interest removed)`)
```

### Considerações

- **Fallback seguro**: Se o produto não existir na tabela `products` ou não tiver preço, usa o `purchase.price.value` original (comportamento atual)
- **Produtos precisam estar sincronizados**: A ação "Sync Produtos" deve ter sido executada pelo menos uma vez para popular a tabela `products` com os preços das ofertas
- **Vendas não-cartão**: Boleto parcelado e recorrência continuam usando `purchase.price.value` normalmente (sem juros nesses casos)
- **Conversão de moeda**: Para vendas em USD/EUR, a conversão para BRL continua funcionando sobre o valor base

