
# Plano: Integrar API do Google Drive para Download de Vídeos

## Resumo
Criar uma Edge Function que faz o download de arquivos do Google Drive usando uma Service Account, permitindo que a transcrição seja feita diretamente a partir de links do Drive sem precisar de upload manual.

## Como Vai Funcionar

```text
1. Usuário cola link do Google Drive
        │
        ▼
2. Clica em "Transcrever" 
        │
        ▼
3. Frontend envia request para Edge Function
        │
        ▼
4. Edge Function autentica via Service Account
        │
        ▼
5. API do Google Drive baixa o arquivo
        │
        ▼
6. Arquivo retorna como base64/blob
        │
        ▼
7. Whisper transcreve localmente no navegador
        │
        ▼
8. Transcrição inserida no roteiro
```

---

## Pré-requisitos (Configuração no Google Cloud)

O usuário precisará:

1. **Criar um projeto no Google Cloud Console**
2. **Ativar a API do Google Drive**
3. **Criar uma Service Account**
4. **Gerar uma chave JSON da Service Account**
5. **Compartilhar os arquivos do Drive com o email da Service Account**

> Vou fornecer um guia passo-a-passo.

---

## Alterações Técnicas

### 1. Adicionar Secret para credenciais do Google

Novo secret: `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON completo da Service Account)

### 2. Criar Edge Function `google-drive-download`

Nova função em `supabase/functions/google-drive-download/index.ts`

**Responsabilidades:**
- Receber o ID do arquivo (extraído do link do Drive)
- Autenticar com Google usando JWT da Service Account
- Fazer download do arquivo via API do Drive
- Retornar o arquivo como base64 para o frontend

**Endpoint da API do Google Drive:**
```
GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media
```

**Headers necessários:**
```
Authorization: Bearer {access_token}
```

### 3. Atualizar `TranscribeFromPostModal.tsx`

Adicionar opção de download automático quando há link do Google Drive:

```typescript
// Detectar se é link do Drive
const driveInfo = getMediaInfo(videoUrl);
if (driveInfo.type === 'google-drive' && driveInfo.id) {
  // Oferecer botão "Baixar do Drive"
}
```

**Fluxo:**
1. Ao clicar "Baixar do Drive", chamar a Edge Function
2. Receber o arquivo como Blob
3. Passar para o Whisper transcrever
4. Inserir no roteiro

### 4. Atualizar `supabase/config.toml`

Adicionar configuração da nova função:

```toml
[functions.google-drive-download]
verify_jwt = false
```

---

## Estrutura da Edge Function

```typescript
// supabase/functions/google-drive-download/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gerar JWT para autenticação com Google
async function getGoogleAccessToken(serviceAccountKey: any): Promise<string> {
  // 1. Criar JWT header + claims
  // 2. Assinar com chave privada da Service Account
  // 3. Trocar JWT por Access Token via Google OAuth
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { fileId } = await req.json();
  
  // Autenticar e baixar arquivo
  const accessToken = await getGoogleAccessToken(serviceAccountKey);
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  
  // Retornar como base64 ou stream
});
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/google-drive-download/index.ts` | Criar |
| `supabase/config.toml` | Modificar (adicionar função) |
| `src/components/conteudo/TranscribeFromPostModal.tsx` | Modificar (adicionar opção Drive) |
| Secret `GOOGLE_SERVICE_ACCOUNT_KEY` | Adicionar |

---

## Limitações Importantes

1. **Arquivos precisam estar compartilhados** com a Service Account (ou públicos)
2. **Tamanho do arquivo**: A Edge Function tem limite de memória, então arquivos muito grandes (>50MB) podem falhar
3. **Custo**: O Google Drive API é gratuito com limites generosos

---

## Alternativa: API Key (mais simples, apenas para arquivos públicos)

Se os arquivos do Drive estiverem configurados como "Qualquer pessoa com o link pode ver", podemos usar apenas uma API Key do Google (sem Service Account). Isso é mais simples mas menos seguro.

---

## Guia de Configuração do Google Cloud

Vou incluir instruções detalhadas para o usuário configurar:
1. Como criar projeto no Google Cloud
2. Como ativar a API do Drive
3. Como criar Service Account
4. Como obter a chave JSON
5. Como compartilhar arquivos com a Service Account

---

## Resultado Esperado

- Quando o post tem link do Google Drive, aparece botão "Baixar do Drive"
- Ao clicar, o arquivo é baixado via Edge Function
- A transcrição é feita automaticamente
- Não precisa mais de upload manual para arquivos do Google Drive
