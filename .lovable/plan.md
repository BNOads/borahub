

## Plano: Testar Sistema de Ticket de Reembolso

### Objetivo

Adicionar uma ação temporária `test_refund_ticket` na edge function `hotmart-sync` para simular a criação de um ticket de reembolso usando dados de uma venda real.

### Dados da venda para teste

- **Transação**: HP2455598889
- **Cliente**: Lucas de Figueiredo Lopes
- **E-mail**: lucas_lopes48@hotmail.com
- **Produto**: Escola BORAnaOBRA
- **Valor**: R$ 339,20

### Mudança — `supabase/functions/hotmart-sync/index.ts`

Adicionar um novo `case "test_refund_ticket"` antes do `default` no switch de ações:

1. Recebe `external_id` no body da requisição
2. Busca a venda na tabela `sales` pelo `external_id`
3. Monta um objeto `HotmartSale` mock com os dados da venda
4. Chama `createRefundTicket(supabase, mockSale, "REFUNDED")`
5. Retorna sucesso

### Execução do teste

Após deploy, invocar:
```
POST hotmart-sync { action: "test_refund_ticket", external_id: "HP2455598889" }
```

Isso vai criar:
- Um ticket com prioridade "critica" (SLA 2h) atribuído a Maria Rosa
- Uma tarefa vinculada ao ticket
- Notificação para Maria Rosa
- Log de criação no ticket

### Validação

Após a chamada, verificar na tela de Tickets se o ticket apareceu corretamente com todos os dados preenchidos.

### Limpeza

A ação `test_refund_ticket` pode ser removida depois da validação, ou mantida para testes futuros.

