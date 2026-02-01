
# Plano: Corrigir Erro ao Associar Vendedor a Venda

## Problema Identificado
O erro "duplicate key value violates unique constraint 'sales_external_id_key'" ocorre quando um usuário tenta associar um vendedor a uma venda existente. O sistema tenta inserir uma nova venda com o mesmo `external_id` em vez de atualizar a venda existente.

## Causa Raiz
1. O modal de criação de venda (`CreateSaleModal.tsx`) verifica se a venda existe antes de decidir entre atualizar ou criar
2. Essa verificação pode falhar devido a políticas RLS ou problemas de timing
3. Quando a verificação falha, o código tenta criar uma nova venda com o mesmo `external_id`, violando a constraint única

## Solução Proposta

### 1. Melhorar a Lógica de Associação no CreateSaleModal
- Usar `upsert` ao invés de `insert` separado para evitar erros de constraint única
- Adicionar tratamento de erro específico para constraint de `external_id`
- Se ocorrer erro de duplicata, tentar fazer UPDATE automaticamente

### 2. Atualizar o Hook useCreateSale
- Modificar para usar `upsert` com `onConflict: 'external_id'`
- Isso garante que vendas duplicadas sejam atualizadas em vez de falhar

### 3. Adicionar Fallback de Erro
- Capturar o erro específico "sales_external_id_key"
- Quando ocorrer, tentar atualizar a venda existente automaticamente
- Mostrar mensagem clara ao usuário

---

## Detalhes Técnicos

### Arquivo: `src/components/vendas/CreateSaleModal.tsx`
**Mudança principal:** Adicionar tratamento de erro no `onSubmit`:
```typescript
async function onSubmit(values: FormValues) {
  try {
    // ... código existente ...
    
    await createSale.mutateAsync({...});
  } catch (error: any) {
    // Tratar erro de duplicata
    if (error.message?.includes('sales_external_id_key')) {
      // Tentar atualizar a venda existente
      const { data: existingSale } = await supabase
        .from('sales')
        .select('id')
        .eq('external_id', values.external_id)
        .maybeSingle();
      
      if (existingSale) {
        await supabase.from('sales')
          .update({ seller_id: values.seller_id, ... })
          .eq('id', existingSale.id);
        // Sucesso!
        return;
      }
    }
    throw error;
  }
}
```

### Arquivo: `src/hooks/useSales.ts`
**Mudança no `useCreateSale`:** Usar upsert:
```typescript
const { data: sale, error: saleError } = await supabase
  .from('sales')
  .upsert({
    ...input,
    created_by: user.id,
  }, {
    onConflict: 'external_id',
    ignoreDuplicates: false // Atualiza se existir
  })
  .select()
  .single();
```

### Fluxo Corrigido
```text
┌─────────────────────────────────────────────────────┐
│              Usuário Associa Vendedor               │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│        Verificar se venda existe (SELECT)           │
└─────────────────────┬───────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
      Encontrou             Não Encontrou
          │                       │
          ▼                       ▼
      UPDATE              UPSERT (Insert/Update)
          │                       │
          │     Se erro           │
          │     duplicata         │
          │     ┌─────────────────┤
          │     │ Retry UPDATE    │
          │     └─────────────────┤
          ▼                       ▼
┌─────────────────────────────────────────────────────┐
│                  Sucesso ✓                          │
└─────────────────────────────────────────────────────┘
```

## Resumo das Alterações
1. **CreateSaleModal.tsx**: Adicionar fallback de erro para duplicatas
2. **useSales.ts**: Usar upsert no `useCreateSale` para tratar conflitos automaticamente
