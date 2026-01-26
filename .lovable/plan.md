
# Plano: Auto-Atribuição de Vendas Asaas com Nomes Semelhantes aos Produtos Hotmart

## Problema Identificado
Atualmente, na aba "Vendas (Asaas)", os nomes dos produtos são muito variados e detalhados (ex: "Parcela 3 de 11. CERTIFICAÇÃO MÉTODO BORAnaOBRA"), enquanto os produtos cadastrados (Hotmart) têm nomes simplificados (ex: "Certificação Método BORAnaOBRA").

O usuário precisa selecionar manualmente cada variação de nome, o que é trabalhoso.

## Solução Proposta
Quando um produto Hotmart for vinculado ao funil (aba "Cadastrados"), automaticamente buscar e vincular todas as vendas Asaas que contenham o nome do produto em seu `product_name`.

### Lógica de Match
```text
Produto Hotmart: "Certificação Método BORAnaOBRA"
                           ↓
Vendas Asaas que serão capturadas automaticamente:
- "Parcela 3 de 11. CERTIFICAÇÃO MÉTODO BORAnaOBRA"
- "ENTRADA CERTIFICAÇÃO MÉTODO BORAnaOBRA"
- "Parcela 1 de 9. Certificação Método BORAnaOBRA"
```

### Alterações Necessárias

#### 1. Atualizar `useFunnelRevenue` no hook
Modificar a lógica de match para usar **busca parcial** (contains) em vez de igualdade exata:

```typescript
// Antes (match exato)
sale.product_name?.toLowerCase().trim() === pn.toLowerCase().trim()

// Depois (match parcial - contains)
pn.toLowerCase().split(' ').every(word => 
  sale.product_name?.toLowerCase().includes(word)
)
```

#### 2. Remover necessidade de vincular Asaas manualmente
Com o match automático, a aba "Vendas (Asaas)" pode:
- **Opção A**: Ser mantida apenas para visualização/auditoria
- **Opção B**: Ser removida, já que o match é automático

**Recomendação**: Manter a aba para casos especiais onde o usuário queira vincular vendas que não contêm o nome exato.

#### 3. Mostrar indicador de vendas incluídas
Na lista de produtos vinculados, exibir quantas vendas Asaas foram capturadas automaticamente por cada produto.

---

## Detalhes da Implementação

### Arquivo: `src/hooks/useFunnelProducts.ts`

Atualizar a função de filtro em `useFunnelRevenue`:

```typescript
// Nova lógica de match: verificar se TODAS as palavras-chave do produto
// estão presentes no nome da venda (case-insensitive)
const matchesProductName = (saleName: string, productName: string) => {
  const saleNameLower = saleName.toLowerCase();
  const keywords = productName.toLowerCase()
    .split(' ')
    .filter(word => word.length > 2); // Ignorar palavras muito curtas
  
  return keywords.every(keyword => saleNameLower.includes(keyword));
};

// Aplicar no filtro
const currentSales = allSales?.filter((sale) => {
  // Match por product_id (exato)
  if (sale.product_id && productIds.includes(sale.product_id)) {
    return true;
  }
  // Match por product_name (parcial - contains)
  if (sale.product_name) {
    return productNames.some(pn => 
      matchesProductName(sale.product_name!, pn)
    );
  }
  return false;
});
```

### Também atualizar:
- `src/pages/FunisView.tsx` - Usar mesma lógica no cálculo do total
- `src/components/dashboard/ActiveLaunches.tsx` - Usar mesma lógica no resumo

---

## Fluxo Atualizado

1. Admin acessa o funil → Aba Configuração
2. Vincula "Certificação Método BORAnaOBRA" (produto Hotmart)
3. **Automaticamente**, todas as vendas Asaas que contêm essas palavras são incluídas no faturamento:
   - "Parcela 3 de 11. CERTIFICAÇÃO MÉTODO BORAnaOBRA"
   - "ENTRADA CERTIFICAÇÃO MÉTODO BORAnaOBRA"
   - etc.
4. A aba "Vendas (Asaas)" permanece disponível para casos especiais

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useFunnelProducts.ts` | Implementar match parcial em `useFunnelRevenue` |
| `src/pages/FunisView.tsx` | Usar match parcial no cálculo do total |
| `src/components/dashboard/ActiveLaunches.tsx` | Usar match parcial no resumo do dashboard |

---

## Benefícios

- Elimina trabalho manual de vincular cada variação de nome
- Captura automaticamente todas as parcelas e variações
- Mantém flexibilidade para casos especiais via aba Asaas
- Match inteligente que funciona com diferentes formatações
