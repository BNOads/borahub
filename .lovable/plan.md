

# Plano: Corrigir Sessões Estratégicas

## 3 Correções Identificadas

### 1. Remover o seletor/filtro "a" do header
O dropdown `<Select>` no topo mostra "a" (nome da sessão) e parece um filtro sem sentido. Será removido. A sessão será selecionada automaticamente (primeira disponível). Se futuramente o usuário tiver múltiplas sessões, o seletor pode ser reintroduzido com melhor UX.

**Arquivo:** `src/pages/SessaoEstrategica.tsx`
- Remover o componente `<Select>` do header (linhas 64-75)
- Manter o `useEffect` que auto-seleciona a primeira sessão

### 2. Exibir reuniões do Cal.com no "Reuniões de Hoje"
Atualmente o `DashboardTab` usa `useGoogleCalendarEvents` que requer Google Calendar ID configurado. Será substituído pelo `useCalComEvents` que já está integrado e funcionando.

**Arquivo:** `src/components/strategic/DashboardTab.tsx`
- Substituir `useGoogleCalendarEvents` por `useCalComEvents`
- Adaptar o mapeamento dos campos (Cal.com usa `title`, `event_date`, `event_time`, `duration_minutes` em vez de `summary`, `start`, `end`)
- Remover a condição `!session.google_calendar_id` — sempre mostrar reuniões Cal.com
- Manter indicador "Ao vivo" para reuniões em andamento

### 3. Corrigir sincronização Google Sheets (edge function)
O erro `SyntaxError: Unexpected non-whitespace character after JSON at position 12` ocorre no `JSON.parse` dentro da edge function. Duas causas possíveis:
- Body da requisição chegando corrompido
- Secret `GOOGLE_SERVICE_ACCOUNT_KEY` com formato incorreto

**Arquivo:** `supabase/functions/sync-strategic-leads/index.ts`
- Adicionar headers CORS completos (incluindo `x-supabase-client-platform` etc.)
- Ler body como texto primeiro (`req.text()`) e fazer `JSON.parse` manualmente com try/catch e mensagem de erro clara
- Envolver o `JSON.parse` do `GOOGLE_SERVICE_ACCOUNT_KEY` em try/catch separado com mensagem descritiva
- Adicionar logs de debug para facilitar diagnóstico futuro

## Nenhuma alteração no banco de dados

