

## Plano: Criar Tickets Automáticos para Reembolsos Hotmart

### Resumo

Detectar vendas com status `REFUNDED` ou `CHARGEBACK` durante a sincronização automática (scheduled_sync) e criar automaticamente um ticket de suporte com SLA urgente (2h), direcionado para **Maria Rosa** (`de5f094a-fd3e-4d01-9f37-78425ea3317f`).

### Mudanças

#### 1. Edge Function `hotmart-sync/index.ts` — Scheduled Sync

No fluxo `scheduled_sync`, após detectar que uma venda mudou para status `REFUNDED` ou `CHARGEBACK`, adicionar lógica para:

1. Verificar se já existe um ticket para essa venda (evitar duplicatas) — buscar na tabela `tickets` por `descricao ILIKE '%{transaction_id}%'`
2. Se não existir, criar um ticket:
   - `cliente_nome`: nome do comprador
   - `cliente_email`: email do comprador  
   - `cliente_whatsapp`: telefone do comprador (se disponível, senão string vazia)
   - `origem`: "hotmart"
   - `categoria`: "reembolso" (para REFUNDED) ou "chargeback" (para CHARGEBACK)
   - `descricao`: Texto descritivo com transação, produto, valor e status
   - `prioridade`: "critica" (SLA de 2h)
   - `responsavel_id`: `de5f094a-fd3e-4d01-9f37-78425ea3317f` (Maria Rosa)
   - `criado_por`: mesmo ID (Maria Rosa, já que é automático)
   - `sla_limite`: now + 2 horas
3. Criar a tarefa vinculada ao ticket (mesma lógica do `useCreateTicket`)
4. Criar notificação para Maria Rosa
5. Registrar log no ticket

#### 2. Helper Function

Criar uma função `createRefundTicket(supabase, sale, status)` que encapsula toda a lógica acima para manter o código organizado.

#### 3. Onde inserir no fluxo

No `scheduled_sync`, após o update da venda existente (linha ~1012-1018), verificar:
```text
if sale was previously "active" and now maps to "cancelled"
  AND original hotmart status is "REFUNDED" or "CHARGEBACK"
  → call createRefundTicket()
```

Para isso, buscar o status anterior da venda antes do update.

### Detalhes

- **Deduplicação**: Antes de criar, buscar tickets existentes com o `external_id` na descrição para evitar duplicatas em syncs consecutivos
- **SLA**: Prioridade "critica" = 2 horas (já configurado no sistema)
- **Categorias novas**: "reembolso" e "chargeback" serão adicionadas automaticamente ao criar tickets com esses valores
- **Sem mudanças no banco**: Usa tabelas existentes (tickets, tasks, ticket_logs, notifications)

