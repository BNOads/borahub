

# Plano: Integrar Agenda com API Cal.com

## Resumo

Criar uma edge function que consulta a API Cal.com (v2) para buscar bookings/reuniões, e exibir esses eventos na Agenda junto com os eventos internos, usando uma badge visual "Cal.com" para diferenciá-los.

---

## 1. Armazenar a chave API

Salvar o secret `CAL_COM_API_KEY` com o valor fornecido pelo usuário nas secrets do projeto.

---

## 2. Edge Function: `fetch-calcom-events/index.ts`

- Endpoint: recebe `date_from` e `date_to` (opcionais)
- Chama `GET https://api.cal.com/v2/bookings` com headers:
  - `Authorization: Bearer CAL_COM_API_KEY`
  - `cal-api-version: 2024-08-13`
- Filtra por status (aceitos/confirmados)
- Mapeia cada booking para o formato compatível com o Event do sistema:
  - `title` = booking title/eventType name
  - `event_date` = data do start
  - `event_time` = hora do start
  - `duration_minutes` = duração
  - `meeting_link` = meetingUrl do booking
  - `location` = location do booking
  - `event_type` = "reuniao"
  - `source` = "calcom" (campo extra para identificação visual)
  - Participantes (attendees)

---

## 3. Hook: atualizar `useEvents.ts`

Criar um novo hook `useCalComEvents()` que:
- Chama a edge function `fetch-calcom-events`
- Retorna eventos no mesmo formato de `Event` (com campo extra `source: 'calcom'`)
- Cache de 5 minutos (staleTime)

---

## 4. Integrar na Agenda

No `Agenda.tsx`:
- Importar `useCalComEvents()`
- Combinar eventos internos + Cal.com em uma lista unificada, ordenada por data/hora
- Nos cards de evento, se `source === 'calcom'`, exibir badge "Cal.com" com cor distinta (laranja)
- Eventos Cal.com são somente leitura (sem botões de editar/excluir)

---

## 5. Integrar nos Calendários

Nos componentes `YearCalendar`, `MonthCalendar` e `WeekCalendar`:
- Os eventos Cal.com já aparecerão automaticamente pois são passados via prop `events`
- Adicionar cor/indicador visual para diferenciar eventos Cal.com dos internos

---

## 6. Config no `supabase/config.toml`

```toml
[functions.fetch-calcom-events]
verify_jwt = false
```

---

## Detalhes Técnicos

- API Cal.com v2: `GET https://api.cal.com/v2/bookings?status=accepted&afterStart={date}`
- Header obrigatório: `cal-api-version: 2024-08-13`
- Auth: `Bearer {CAL_COM_API_KEY}`
- Eventos Cal.com terão `id` prefixado com `calcom-` para evitar colisão com IDs internos
- Não serão salvos no banco — são buscados em tempo real da API

