

## Plano: Ferramenta de Gestão de Envio de Livros

### Contexto
Criar um módulo completo para rastrear vendas de livros (Hotmart) → criação de pedidos (Bling) → envio pelos Correios, com layout semelhante à Sessão Estratégica (Tabs: Dashboard, CRM Kanban, Configuração).

### Pré-requisito: API Key da Bling V3
Antes de implementar, preciso solicitar a API key da Bling V3 como secret do projeto. A Bling V3 usa OAuth2 ou API key dependendo da configuração.

---

### 1. Banco de Dados — Nova tabela `book_shipments`

```sql
CREATE TABLE book_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id),
  external_id TEXT, -- transaction ID Hotmart
  product_name TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_address JSONB, -- endereço completo
  sale_date TIMESTAMPTZ,
  sale_value NUMERIC(12,2),
  stage TEXT NOT NULL DEFAULT 'venda', -- venda, pedido_bling, etiqueta, enviado, entregue
  bling_order_id TEXT, -- ID do pedido no Bling
  tracking_code TEXT, -- código de rastreio Correios
  label_url TEXT, -- URL da etiqueta
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  bling_created_at TIMESTAMPTZ,
  label_generated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS + trigger updated_at
-- Índices em stage, external_id
```

Tabela `book_shipment_history` para histórico de movimentações (similar a `strategic_lead_history`).

### 2. Edge Function `bling-sync`

- **Ações**: `create_order` (cria pedido no Bling), `get_label` (gera etiqueta), `check_tracking` (verifica rastreio)
- Integração com Bling V3 API: `/pedidos/vendas`, `/nfe`, `/logistica`
- Atualiza `book_shipments` automaticamente

### 3. Edge Function `hotmart-book-sales` (ou extensão do `hotmart-sync`)

- Filtra vendas de produtos cujo nome contenha "livro", "GDAE" e aliases
- Cria registros em `book_shipments` automaticamente para novas vendas

### 4. Página `LivrosView.tsx` — Layout Sessão Estratégica

**Tabs:**
- **Dashboard**: KPIs (vendas hoje, semana, mês), ranking de livros mais vendidos, tempo médio de geração de código e envio, gráfico de vendas por dia
- **CRM Kanban**: 5 colunas (Venda → Pedido Bling → Etiqueta → Enviado → Entregue) com drag-and-drop, auto-move baseado nos dados do Bling/Correios
- **Configuração**: Aliases de produtos, API key Bling

**Métricas de tempo:**
- Tempo médio: venda → código de rastreio gerado
- Tempo médio: código gerado → enviado
- Alertas visuais para envios atrasados

### 5. Hook `useBookShipments.ts`

- CRUD de shipments
- Queries filtradas por stage, período
- Mutation para mover entre estágios

### 6. Rota `/livros`

Adicionada ao `App.tsx` e ao menu de navegação.

---

### Ordem de implementação
1. Configurar secret `BLING_API_KEY`
2. Criar tabela `book_shipments` + `book_shipment_history`
3. Criar edge function `bling-sync`
4. Estender `hotmart-sync` para identificar vendas de livros
5. Criar página, hooks e componentes do frontend
6. Adicionar rota e navegação

### Detalhes técnicos
- O Kanban usa `@dnd-kit` (já instalado) replicando o padrão de `CRMTab.tsx`
- Aliases de livros: `['livro', 'book', 'gdae', 'guia de ação empreendedora']` — configuráveis
- Auto-sync: cron job para verificar status no Bling periodicamente
- Dashboard usa `recharts` (já instalado) para gráficos de vendas diárias e ranking

