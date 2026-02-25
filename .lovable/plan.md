

# Plano: Sincronização Google Sheets via Link Público (sem API Key)

## Problema Atual

A sincronização com Google Sheets usa a **Google Sheets API v4** com Service Account, que requer um JSON de credenciais (`GOOGLE_SERVICE_ACCOUNT_KEY`). Esse secret está configurado com valor inválido (Client ID ao invés de JSON), causando o erro persistente de parsing.

## Solução

Substituir completamente a abordagem de API por **link público do Google Sheets em formato JSON**. O Google Sheets permite exportar dados como JSON/CSV quando a planilha é compartilhada publicamente ("Qualquer pessoa com o link pode visualizar").

### Como funciona

Quando uma planilha Google é pública, pode-se acessar seus dados via:
```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/gviz/tq?tqx=out:json
```

Isso retorna os dados em formato JSON sem necessidade de autenticação, API key ou service account.

## Alterações

### 1. Edge Function `sync-strategic-leads/index.ts` — Reescrita simplificada
- Remover toda a lógica de Service Account (funções `getGoogleAccessToken`, `pemToArrayBuffer`, `arrayBufferToBase64Url`)
- Remover referência ao secret `GOOGLE_SERVICE_ACCOUNT_KEY`
- Extrair o ID da planilha da URL salva na sessão
- Buscar dados via endpoint público `gviz/tq?tqx=out:json`
- Parsear a resposta (Google retorna um wrapper `google.visualization.Query.setResponse(...)` que precisa ser extraído)
- Manter toda a lógica de qualificação e upsert de leads intacta

### 2. Nenhuma alteração no frontend
- O hook `useSyncGoogleSheet` e o `ConfigTab` permanecem iguais
- O campo "URL da Google Sheet" já existe na configuração

### 3. Nenhuma alteração no banco de dados

## Pré-requisito para o usuário
A planilha Google Sheets precisa estar com compartilhamento público ativado ("Qualquer pessoa com o link pode visualizar"). Sem isso, o endpoint retorna erro.

## Detalhes Técnicos

### Parsing da resposta pública do Google Sheets
O endpoint `gviz/tq` retorna algo como:
```
google.visualization.Query.setResponse({...json...});
```
É necessário extrair o JSON interno com regex e mapear `cols` (headers) e `rows` (dados) para o formato que a lógica de sync já espera.

Alternativamente, usar o endpoint CSV:
```
https://docs.google.com/spreadsheets/d/{ID}/export?format=csv
```
que é mais simples de parsear e mais confiável. Essa será a abordagem escolhida.

### Fluxo da Edge Function simplificada
1. Receber `session_id`
2. Buscar sessão e extrair spreadsheet ID da URL
3. Fetch CSV público: `https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid=0`
4. Parsear CSV em linhas/colunas
5. Aplicar critérios de qualificação (mesma lógica atual)
6. Upsert leads no banco

