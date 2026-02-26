

## Situação atual - Diagnóstico

**Problema:** As vendas duplicadas que foram deletadas anteriormente (aquelas com IDs malformados contendo caracteres tab) foram removidas diretamente do banco de dados via DELETE, e **não existe tabela de auditoria nem histórico de exclusões**. Os logs do banco também não retêm essas operações.

**O que sabemos:**
- A limpeza anterior transferiu `seller_id`, `commission_percent` e `proof_link` dos registros duplicados para os registros originais **antes** de deletar os duplicados
- **Luiza Kauark**: 16 vendas associadas atualmente — os dados foram preservados na transferência
- **Carol Miguel**: apenas 2 vendas associadas (Cristiane Santos HP3479426773 e Taciane Carvalho pay_j9eu32a48aul35lz). Nenhum registro `created_by` dela existe, ou seja, ela nunca cadastrou vendas pelo sistema
- Não há registros órfãos na tabela de parcelas (installments), confirmando que os deletes foram limpos
- **Não há como recuperar os registros deletados** — não existe backup, audit trail, nem log de banco retido

## Plano de implementação

### 1. Criar tabela de auditoria `sales_audit_log`
Tabela para registrar toda alteração (INSERT, UPDATE, DELETE) na tabela `sales`, armazenando o estado anterior e novo do registro com timestamp e user_id.

Colunas: `id`, `sale_id`, `operation` (INSERT/UPDATE/DELETE), `old_data` (jsonb), `new_data` (jsonb), `changed_at`, `changed_by`

### 2. Criar trigger automático na tabela `sales`
Trigger `AFTER INSERT OR UPDATE OR DELETE` que popula a tabela de auditoria automaticamente a cada operação, capturando o estado completo do registro antes e depois.

### 3. Adicionar visualização do histórico no sistema
Criar uma aba ou seção acessível para admins onde possam consultar o log de auditoria de vendas — filtrado por vendedor, data ou operação.

---

### Sobre a recuperação das vendas da Carol

Como não existe histórico, a única forma de recompor as vendas dela é:
- **Verificar diretamente na Hotmart** quais transações foram feitas por ela (pelo tracking ou comprovantes que ela enviou)
- **Reassociar manualmente** as vendas não atribuídas (`seller_id IS NULL`) que pertençam a ela

Atualmente existem diversas vendas sem vendedor no sistema que podem ser dela. Com o audit log implementado, isso nunca mais acontecerá.

