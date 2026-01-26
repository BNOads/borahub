
# Plano: Associar Produtos a Funis e Exibir Faturamento

## Objetivo
Permitir vincular um ou mais produtos da tabela `products` a cada funil, e exibir automaticamente o faturamento gerado por esses produtos no painel do funil, com filtro por data.

## Estrutura Atual Identificada

**Tabela funnels**: Contém funis com `product_name` (texto livre), datas de captação/fechamento
**Tabela products**: Produtos cadastrados (vindos do Hotmart/Asaas ou manuais)
**Tabela sales**: Vendas com `product_name` e `product_id`, valores e datas

**Problema**: Atualmente o campo `product_name` do funil é apenas texto descritivo, sem vínculo direto com a tabela de produtos e vendas.

---

## Solução Proposta

### 1. Nova Tabela: `funnel_products`
Tabela de relacionamento N:N entre funis e produtos.

```text
funnel_products
├── id (uuid, PK)
├── funnel_id (uuid, FK → funnels)
├── product_id (uuid, FK → products)
├── created_at (timestamp)
```

### 2. Componente de Seleção de Produtos no Funil
Adicionar na aba de **Configuração** do painel do funil:
- Lista de produtos vinculados
- Botão para adicionar/remover produtos (multi-select)
- Busca de produtos disponíveis

### 3. Card de Faturamento no Painel do Funil
Novo card na aba **Visão Geral** exibindo:
- Faturamento total dos produtos vinculados
- Quantidade de vendas
- Filtro por período (últimos 7/30/90 dias, personalizado)
- Gráfico de evolução (opcional)

**Cálculo do faturamento**:
```
Soma de sales.total_value
WHERE product_id IN (produtos vinculados ao funil)
  AND sales.status = 'active'
  AND sales.sale_date BETWEEN [data_inicio] AND [data_fim]
```

### 4. Match Automático por Nome (Opcional)
Para facilitar, sugerir produtos que contenham palavras-chave do `product_name` do funil:
- Funil "CMB14" com produto "Certificação Método BORAnaOBRA" → Sugerir match

---

## Arquivos a Modificar/Criar

| Arquivo | Alteração |
|---------|-----------|
| **Migração SQL** | Criar tabela `funnel_products` com RLS |
| `src/components/funnel-panel/types.ts` | Adicionar tipos para FunnelProduct |
| `src/hooks/useFunnelProducts.ts` | Novo hook para CRUD de produtos do funil |
| `src/components/funnel-panel/FunnelProducts.tsx` | Novo componente de gestão de produtos |
| `src/components/funnel-panel/FunnelRevenue.tsx` | Novo card de faturamento |
| `src/pages/FunnelPanel.tsx` | Integrar novos componentes |
| `src/components/funnel-panel/index.ts` | Exportar novos componentes |

---

## Detalhes da Interface

### Seção de Produtos Vinculados (Configuração)
```
┌─────────────────────────────────────────────────┐
│ 📦 Produtos Vinculados                    [+]   │
├─────────────────────────────────────────────────┤
│ • Certificação Método BORAnaOBRA          [x]   │
│ • BNO Experience 2026                     [x]   │
│ • + 1 ano de acesso a Certificação        [x]   │
└─────────────────────────────────────────────────┘
```

### Card de Faturamento (Visão Geral)
```
┌─────────────────────────────────────────────────┐
│ 💰 Faturamento dos Produtos                     │
│ ┌────────────────┐                              │
│ │ Este mês  ▼    │                              │
│ └────────────────┘                              │
├─────────────────────────────────────────────────┤
│ R$ 125.430,00           47 vendas               │
│                                                 │
│ 📈 +23% vs período anterior                     │
└─────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Migração SQL
```sql
CREATE TABLE funnel_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id uuid NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(funnel_id, product_id)
);

-- RLS para acesso autenticado
ALTER TABLE funnel_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view funnel_products"
  ON funnel_products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage funnel_products"
  ON funnel_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Hook useFunnelProducts
```typescript
// Buscar produtos vinculados a um funil
export function useFunnelProducts(funnelId: string) {
  return useQuery({
    queryKey: ['funnel-products', funnelId],
    queryFn: async () => {
      const { data } = await supabase
        .from('funnel_products')
        .select('*, product:products(*)')
        .eq('funnel_id', funnelId);
      return data;
    },
  });
}

// Buscar faturamento dos produtos do funil
export function useFunnelRevenue(funnelId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['funnel-revenue', funnelId, startDate, endDate],
    queryFn: async () => {
      // 1. Buscar product_ids vinculados ao funil
      const { data: funnelProducts } = await supabase
        .from('funnel_products')
        .select('product_id')
        .eq('funnel_id', funnelId);
      
      const productIds = funnelProducts?.map(fp => fp.product_id) || [];
      if (!productIds.length) return { total: 0, count: 0, sales: [] };
      
      // 2. Buscar vendas desses produtos
      let query = supabase
        .from('sales')
        .select('id, total_value, sale_date, product_name')
        .in('product_id', productIds)
        .eq('status', 'active');
      
      if (startDate) query = query.gte('sale_date', startDate);
      if (endDate) query = query.lte('sale_date', endDate);
      
      const { data: sales } = await query;
      
      return {
        total: sales?.reduce((sum, s) => sum + s.total_value, 0) || 0,
        count: sales?.length || 0,
        sales: sales || [],
      };
    },
  });
}
```

---

## Fluxo de Uso

1. **Admin acessa** Funis → Seleciona funil ativo
2. **Na aba Configuração**: Clica em "Vincular Produtos"
3. **Modal abre** com lista de produtos disponíveis (checkbox)
4. **Seleciona produtos** relacionados ao funil (ex: CMB14)
5. **Volta para Visão Geral**: Card de faturamento mostra vendas em tempo real
6. **Pode filtrar por período**: Este mês, últimos 30 dias, período do funil

---

## Considerações

- Match por `product_id` é mais preciso que por texto
- Vendas via Hotmart precisam ter `product_id` preenchido (pode adicionar sync)
- O período pode usar datas do funil (captação até fechamento) como default
- Futuros: Adicionar gráfico de evolução diária/semanal
