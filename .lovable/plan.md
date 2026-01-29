
# Plano: Sistema de Live Chat de Atendimento

## Visao Geral

Sistema completo de atendimento ao cliente em tempo real que permite visitantes do site de vendas BORAnaOBRA iniciarem conversas com atendentes da equipe. Inclui widget publico para o site, painel de atendimento para colaboradores, e painel administrativo para gestao e metricas.

## Arquitetura do Sistema

### Componentes Principais

```text
+------------------+       +-------------------+       +------------------+
|  WIDGET PUBLICO  |       |  PAINEL ATENDIM.  |       |  PAINEL ADMIN    |
|  (Site Vendas)   | <---> |  (Hub Interno)    | <---> |  (Hub Interno)   |
|                  |       |                   |       |                  |
| - Inicio chat    |       | - Fila conversas  |       | - Dashboard      |
| - Mensagens      |       | - Chat ativo      |       | - Monitoramento  |
| - Status online  |       | - Historico       |       | - Configuracoes  |
+------------------+       +-------------------+       +------------------+
        |                          |                          |
        +------------+-------------+-------------+------------+
                     |                           |
              +------v------+             +------v------+
              |  SUPABASE   |             |  REALTIME   |
              |  Database   |             |  Channels   |
              +-------------+             +-------------+
```

## Fase 1: Estrutura de Dados

### Novas Tabelas no Banco

**chat_conversations** - Conversas de atendimento

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| visitor_name | text | Nome do visitante |
| visitor_email | text | Email do visitante |
| visitor_phone | text | Telefone (opcional) |
| visitor_session_id | text | Identificador unico do visitante |
| origin_page | text | Pagina de origem no site |
| status | text | waiting, active, closed |
| assigned_to | uuid | FK profiles - Atendente |
| started_at | timestamp | Inicio da conversa |
| assigned_at | timestamp | Quando foi atribuida |
| closed_at | timestamp | Quando foi encerrada |
| closed_by | text | visitor, agent, system, admin |
| created_at | timestamp | Data criacao |

**chat_messages** - Mensagens das conversas

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| conversation_id | uuid | FK chat_conversations |
| sender_type | text | visitor, agent, system |
| sender_id | uuid | FK profiles (null para visitor) |
| content | text | Conteudo da mensagem |
| is_read | boolean | Se foi lida |
| created_at | timestamp | Data envio |

**chat_agent_status** - Status dos atendentes

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| agent_id | uuid | FK profiles |
| status | text | online, away, offline |
| max_concurrent_chats | int | Maximo conversas simultaneas |
| updated_at | timestamp | Ultima atualizacao |

**chat_settings** - Configuracoes do chat

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| key | text | Chave da configuracao |
| value | jsonb | Valor (cores, textos, etc) |
| updated_at | timestamp | Ultima atualizacao |

### Configuracoes Realtime

```sql
-- Habilitar realtime para mensagens e conversas
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_agent_status;
```

## Fase 2: Widget Publico (Site de Vendas)

### Componentes a Criar

**src/components/chat-widget/** (componentes embeddable)

```text
chat-widget/
  ├── ChatWidget.tsx          # Container principal
  ├── ChatButton.tsx          # Botao flutuante
  ├── ChatWindow.tsx          # Janela de conversa
  ├── ChatHeader.tsx          # Cabecalho com status
  ├── ChatMessages.tsx        # Lista de mensagens
  ├── ChatInput.tsx           # Campo de input
  ├── ChatStartForm.tsx       # Formulario inicial
  ├── ChatTypingIndicator.tsx # Indicador "digitando..."
  └── ChatOfflineMessage.tsx  # Mensagem offline
```

### Funcionamento

1. **Inicializacao**
   - Widget carrega e verifica se ha atendentes online
   - Mostra indicador visual de disponibilidade
   - Recupera conversa existente do localStorage se houver

2. **Inicio de Conversa**
   - Visitante preenche: nome, email, telefone (opcional), mensagem
   - Conversa criada com status "waiting"
   - Entra na fila de atendimento
   - Exibe "Aguardando atendente..."

3. **Durante Atendimento**
   - Mensagens em tempo real via Supabase Realtime
   - Indicador de "digitando" bidirecional
   - Indicador de leitura
   - Botao para encerrar conversa

### Geracao de Codigo de Instalacao

O admin podera copiar um snippet JavaScript para inserir no site:

```html
<script>
  (function(w,d,s,o,f,js,fjs){
    w['BORAChat']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.async=1;js.src=f;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','borachat','https://borahub.lovable.app/chat-widget.js'));
  borachat('init', { projectId: 'xvgermmegyipzmiwewzo' });
</script>
```

## Fase 3: Painel de Atendimento (Hub)

### Nova Pagina

**src/pages/LiveChatView.tsx** - Pagina principal do chat

### Componentes a Criar

**src/components/livechat/**

```text
livechat/
  ├── AgentStatusBar.tsx        # Barra de status do atendente
  ├── ChatQueue.tsx             # Fila de conversas aguardando
  ├── ChatQueueItem.tsx         # Item individual da fila
  ├── ActiveConversations.tsx   # Lista de conversas ativas
  ├── ConversationItem.tsx      # Item de conversa ativa
  ├── ChatPanel.tsx             # Painel de conversa aberta
  ├── ChatPanelHeader.tsx       # Info do cliente + acoes
  ├── ChatMessageList.tsx       # Lista de mensagens
  ├── ChatMessageInput.tsx      # Input de resposta
  ├── ChatHistory.tsx           # Historico de conversas
  ├── ChatHistoryItem.tsx       # Item do historico
  └── TransferModal.tsx         # Modal de transferencia
```

### Layout do Painel

```text
+------------------------------------------------------------------+
|  [Status: Online ▼]  |  Fila: 3  |  Ativos: 2  |  [🔔 2]         |
+------------------------------------------------------------------+
|  FILA (3)          |  CONVERSA COM MARIA           |  CLIENTE    |
|---------------------|--------------------------------|-------------|
|  🟡 João           |  [Mensagens em tempo real]    |  Nome: Maria|
|  há 2 min          |                                |  Email: ... |
|  "Preciso de..."   |                                |  Tel: ...   |
|---------------------|                                |  Origem: /  |
|  🟡 Pedro          |                                |  Duracao: 5m|
|  há 5 min          |                                |-------------|
|---------------------|                                |  [Encerrar] |
|  ATIVOS (2)        |--------------------------------|  [Transfer] |
|---------------------|  [Mensagem... ]    [Enviar]   |             |
|  🟢 Maria          |                                |             |
|  🟢 Ana            |                                |             |
+------------------------------------------------------------------+
```

### Hooks a Criar

**src/hooks/useLiveChat.ts**

```typescript
// Hooks para gerenciamento do chat
useChatQueue()           // Conversas aguardando
useActiveConversations() // Conversas ativas do atendente
useConversation(id)      // Conversa especifica
useChatMessages(id)      // Mensagens de uma conversa
useAgentStatus()         // Status do atendente atual
useOnlineAgents()        // Atendentes online
useSendMessage()         // Enviar mensagem
useClaimConversation()   // Assumir conversa da fila
useCloseConversation()   // Encerrar conversa
useTransferConversation()// Transferir para outro
useChatSettings()        // Configuracoes do chat
```

### Realtime Subscriptions

```typescript
// Subscription para novas mensagens
supabase
  .channel('chat-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `conversation_id=eq.${conversationId}`
  }, handleNewMessage)
  .subscribe()

// Subscription para status da fila
supabase
  .channel('chat-queue')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'chat_conversations',
    filter: 'status=eq.waiting'
  }, handleQueueUpdate)
  .subscribe()
```

## Fase 4: Painel Administrativo

### Componentes Adicionais

**src/components/livechat/admin/**

```text
admin/
  ├── ChatDashboard.tsx         # Dashboard em tempo real
  ├── ChatMetricsCards.tsx      # Cards de metricas
  ├── ChatAgentsStatus.tsx      # Status de todos atendentes
  ├── AllConversationsView.tsx  # Todas conversas
  ├── ConversationMonitor.tsx   # Monitorar conversa
  ├── ChatConfigPanel.tsx       # Configuracoes gerais
  ├── WidgetCustomizer.tsx      # Personalizacao do widget
  ├── WidgetPreview.tsx         # Preview em tempo real
  └── ChatReports.tsx           # Relatorios e metricas
```

### Dashboard Admin

```text
+------------------------------------------------------------------+
|  LIVE CHAT - DASHBOARD                                           |
+------------------------------------------------------------------+
|  +------------+  +------------+  +------------+  +------------+  |
|  | ONLINE: 3  |  | FILA: 5    |  | ATIVOS: 8  |  | HOJE: 47   |  |
|  | atendentes |  | aguardando |  | conversas  |  | conversas  |  |
|  +------------+  +------------+  +------------+  +------------+  |
+------------------------------------------------------------------+
|  ATENDENTES                    |  CONVERSAS NA FILA              |
|--------------------------------|----------------------------------|
|  🟢 João (2/3)                 |  Maria - 2min - "Quero comprar"|
|  🟢 Ana (1/3)                  |  Pedro - 5min - "Duvida sobre" |
|  🟡 Carlos (3/3 - ocupado)     |  João - 8min - "Preciso..."    |
|  🔴 Maria (offline)            |                                  |
+------------------------------------------------------------------+
|  [Monitorar Conversas]  [Configuracoes]  [Relatorios]            |
+------------------------------------------------------------------+
```

### Personalizacao do Widget

Interface para admin customizar:

- **Botao Flutuante**: posicao, formato, tamanho, cores, icone
- **Janela de Chat**: cores do cabecalho, fundo, mensagens
- **Textos**: saudacao, offline, ausente, encerramento
- **Preview**: visualizacao em tempo real das mudancas

## Fase 5: Metricas e Relatorios

### Metricas Coletadas

- Total de conversas (por periodo)
- Tempo medio de primeira resposta
- Tempo medio de atendimento
- Taxa de abandono
- Conversas por atendente
- Horarios de pico
- Taxa de resolucao

### Hook de Metricas

**src/hooks/useChatMetrics.ts**

```typescript
useChatMetrics(period: 'day' | 'week' | 'month')
useChatMetricsByAgent(agentId, period)
useChatPeakHours(period)
```

## Rota e Navegacao

### Nova Rota

```typescript
// App.tsx
<Route path="/livechat" element={
  <ProtectedRoute>
    <LiveChatView />
  </ProtectedRoute>
} />
```

### Navegacao

Adicionar item no menu/sidebar:
- Icone: MessageCircle
- Label: "Live Chat" 
- Badge com contador de fila (para atendentes)

## Integracao com Dashboard

### Card no Index

Adicionar widget no dashboard principal mostrando:
- Status do chat (online/offline)
- Conversas na fila
- Metricas do dia

## Notificacoes

### Para Atendentes

- Som + badge para nova conversa na fila
- Som para nova mensagem em conversa ativa
- Alerta visual se tempo de resposta excede limite

### Para Admins

- Alerta de fila cheia (threshold configuravel)
- Alerta de nenhum atendente online em horario comercial

## Seguranca e RLS

### Politicas RLS

```sql
-- Atendentes podem ver/responder conversas atribuidas a eles
-- Admins podem ver todas as conversas
-- Widget publico pode criar conversas e mensagens (visitor)
-- Mensagens sao read-only apos criacao
```

## Resumo de Arquivos

### Novos Arquivos

| Tipo | Caminho | Descricao |
|------|---------|-----------|
| Page | src/pages/LiveChatView.tsx | Pagina principal |
| Hook | src/hooks/useLiveChat.ts | Hooks do chat |
| Hook | src/hooks/useChatMetrics.ts | Hooks de metricas |
| Components | src/components/livechat/*.tsx | ~15 componentes |
| Components | src/components/livechat/admin/*.tsx | ~8 componentes |
| Components | src/components/chat-widget/*.tsx | ~8 componentes |
| Public | public/chat-widget.js | Script embeddable |

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| src/App.tsx | Adicionar rota /livechat |
| src/components/layout/Header.tsx | Link para Live Chat |
| src/pages/Index.tsx | Card de metricas do chat |

### Banco de Dados

- 4 novas tabelas com RLS
- 3 tabelas com Realtime habilitado
- Indexes para performance

## Faseamento Sugerido

**Fase 1 (MVP)**: Banco + Hooks + Painel Basico de Atendimento
**Fase 2**: Widget Publico + Realtime
**Fase 3**: Painel Admin + Metricas
**Fase 4**: Personalizacao Widget + Relatorios Avancados

## Consideracoes Tecnicas

1. **Performance**: Usar Supabase Realtime com channels especificos por conversa
2. **Offline**: Widget detecta status e mostra mensagem apropriada
3. **Persistencia**: Conversa do visitante persiste via localStorage
4. **Notificacoes**: Usar Web Notifications API + sons
5. **Responsivo**: Funcionar em desktop e mobile
6. **Acessibilidade**: ARIA labels, navegacao por teclado
