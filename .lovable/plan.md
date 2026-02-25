

# Plano: Badge de Aluno nos Leads

## Contexto

A tabela `sales` já contém 1906 vendas sincronizadas da Hotmart e Asaas, com campos `client_email`, `client_phone` e `product_name`. Os leads possuem `email` e `phone` nos campos diretos, e também `e-mail` e `whatsapp` no `extra_data`.

A abordagem ideal é consultar a tabela `sales` localmente (já sincronizada) em vez de chamar as APIs externas a cada render — isso é mais rápido, confiável e não consome rate limits.

## Lógica

1. Ao carregar os leads do CRM, buscar todos os registros distintos de `(client_email, client_phone, product_name, platform)` da tabela `sales`
2. Para cada lead, comparar o `email` e `phone` (normalizados) contra os dados de vendas
3. Se houver match por email OU telefone, marcar como "Aluno" e listar os produtos

## Alterações

### 1. Novo hook `useLeadStudentStatus` em `useStrategicSession.ts`

Query que traz todos os pares únicos de `(client_email, client_phone, product_name, platform)` da tabela `sales`:

```typescript
useQuery({
  queryKey: ["sales-student-lookup"],
  queryFn: async () => {
    const { data } = await supabase
      .from("sales")
      .select("client_email, client_phone, product_name, platform");
    return data;
  },
});
```

Uma função utilitária `getStudentInfo(lead, salesData)` normaliza email/telefone (remove espaços, lowercase, strip "+55") e busca matches, retornando `{ isStudent: boolean, products: string[] }`.

### 2. Badge "Aluno" no card do Kanban (`CRMTab.tsx`)

Dentro do `DraggableLeadCard`, adicionar uma badge azul/ciano `🎓 Aluno` quando o lead for identificado como aluno. A badge será discreta, ao lado da badge de scoring.

### 3. Detalhes de produtos no Sheet lateral

Quando o lead for aluno, no detalhe exibir uma seção "Aluno" com:
- Lista dos produtos que possui
- Plataforma de origem (Hotmart / Asaas)
- Badge visual "Aluno" em destaque

### 4. Performance

- Os dados de vendas são cacheados pelo React Query (staleTime alto)
- O matching é feito via `useMemo` para evitar recálculos
- A normalização de telefone remove prefixos como "+55", "55", espaços e traços para matching robusto

## Detalhes Técnicos

Normalização de telefone para matching:
```text
Lead phone: "5511958971759"
Sale phone: "+55 11 95897-1759"
→ Ambos normalizam para: "11958971759"
```

Normalização de email:
```text
Comparação case-insensitive, trim de espaços
Busca também no extra_data["e-mail"] e extra_data["whatsapp"]
```

## Arquivos a modificar

- `src/hooks/useStrategicSession.ts` — novo hook para buscar dados de vendas
- `src/components/strategic/CRMTab.tsx` — badge de aluno nos cards e seção de produtos no detalhe

