
# Plano de Implementacao - Ferramenta de Transcricao de Videos

## Visao Geral

Implementar uma ferramenta nativa de transcricao de videos no BoraHub que permite:
- Upload manual de arquivos de audio/video
- Transcricao de videos ja existentes na plataforma
- Diarizacao automatica (identificacao de speakers)
- Historico de transcricoes

A transcricao sera feita via ElevenLabs Speech-to-Text (Scribe v2), que suporta diarizacao e diversos formatos de audio.

---

## Arquitetura da Solucao

```text
+-------------------+     +------------------+     +----------------+
|   Frontend React  | --> |  Edge Function   | --> |   ElevenLabs   |
|   (Upload/View)   |     |  transcribe-video|     |   Scribe API   |
+-------------------+     +------------------+     +----------------+
         |                        |
         v                        v
+-------------------+     +------------------+
| Supabase Storage  |     |  Supabase DB     |
| (video-uploads)   |     |  (transcriptions)|
+-------------------+     +------------------+
```

---

## Fase 1: Configuracao de Infraestrutura

### 1.1 Conectar ElevenLabs

Usar o conector ElevenLabs para obter a API key:
- Chamar `standard_connectors--connect` com `connector_id: "elevenlabs"`
- A chave `ELEVENLABS_API_KEY` ficara disponivel como secret

### 1.2 Criar Storage Bucket

Migrar SQL para criar bucket de uploads:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('video-uploads', 'video-uploads', false, 104857600);
-- 100MB limit

-- RLS policies para upload
CREATE POLICY "Users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'video-uploads');

CREATE POLICY "Users can view their uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 1.3 Criar Tabela de Transcricoes

```sql
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'post', 'lesson')),
  source_id TEXT, -- ID do post/lesson se aplicavel
  original_file_path TEXT,
  original_file_name TEXT,
  duration_seconds INTEGER,
  language TEXT DEFAULT 'pt',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  speakers_count INTEGER,
  transcript_text TEXT,
  transcript_segments JSONB, -- Array com {speaker, start, end, text}
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transcriptions"
ON transcriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transcriptions"
ON transcriptions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transcriptions"
ON transcriptions FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own transcriptions"
ON transcriptions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Admins podem ver todas
CREATE POLICY "Admins can view all transcriptions"
ON transcriptions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## Fase 2: Edge Function para Transcricao

### 2.1 Criar `transcribe-video/index.ts`

Edge function que:
1. Recebe arquivo de audio (base64 ou URL do storage)
2. Chama ElevenLabs Scribe v2 API com diarizacao
3. Atualiza registro na tabela `transcriptions`
4. Retorna transcricao estruturada

Parametros:
- `transcription_id`: ID do registro a atualizar
- `file_url`: URL do arquivo no storage
- `language`: Codigo do idioma (default: "pt")

Resposta estruturada:
```json
{
  "text": "Transcricao completa...",
  "segments": [
    {
      "speaker": "Pessoa 1",
      "start": 0.5,
      "end": 5.2,
      "text": "Fala da pessoa..."
    }
  ],
  "speakers_count": 2,
  "duration": 120.5
}
```

---

## Fase 3: Frontend - Pagina Principal

### 3.1 Criar `src/pages/TranscricoesView.tsx`

Pagina com duas abas:
1. **Nova Transcricao**: Upload de arquivo
2. **Historico**: Lista de transcricoes anteriores

### 3.2 Componente de Upload

Layout similar ao `ValidadorCopy.tsx`:
- Card central com area de drag & drop
- Selecao de idioma (default: Portugues Brasil)
- Botao "Transcrever"
- Progress bar durante processamento

Formatos suportados:
- Audio: MP3, M4A, AAC, WAV, OGG, OPUS, WMA
- Video: MP4, MOV, MPEG, WMV

### 3.3 Componente de Resultado

Exibicao da transcricao:
- Blocos por speaker com cores diferentes
- Timestamps clicaveis
- Acoes: Copiar texto, Download TXT/PDF

### 3.4 Historico de Transcricoes

Tabela com:
- Nome do arquivo/video
- Data
- Duracao
- Status (badge colorido)
- Acoes (Ver, Baixar, Excluir)

---

## Fase 4: Integracao com Posts de Conteudo

### 4.1 Modificar `PostDetailsModal.tsx`

Adicionar botao "Transcrever Video" quando houver `video_url`:
- Botao aparece ao lado do embed de video
- Clique inicia processo de transcricao
- Transcricao fica vinculada ao post

### 4.2 Modificar `VideoEmbed.tsx`

Adicionar prop opcional `onTranscribe`:
- Se fornecido, mostra botao de transcricao
- Callback dispara quando usuario solicita

---

## Fase 5: Hook e Utilitarios

### 5.1 Criar `src/hooks/useTranscriptions.ts`

Hooks para:
- `useTranscriptions()`: Lista transcricoes do usuario
- `useCreateTranscription()`: Inicia nova transcricao
- `useDeleteTranscription()`: Remove transcricao

### 5.2 Criar `src/lib/transcriptionUtils.ts`

Funcoes utilitarias:
- `formatTimestamp(seconds)`: Converte para "00:00:00"
- `generateTranscriptTXT(segments)`: Gera texto formatado
- `generateTranscriptPDF(segments)`: Gera PDF com jsPDF (ja instalado)

---

## Fase 6: Rotas e Navegacao

### 6.1 Adicionar Rota em `App.tsx`

```tsx
<Route path="/transcricoes" element={<TranscricoesView />} />
```

### 6.2 Adicionar ao Menu

Incluir link na navegacao principal com icone apropriado (ex: `FileAudio` do Lucide).

---

## Estrutura de Arquivos

```text
src/
├── pages/
│   └── TranscricoesView.tsx          # Pagina principal
├── components/
│   └── transcricoes/
│       ├── TranscriptionUpload.tsx   # Area de upload
│       ├── TranscriptionResult.tsx   # Exibicao do resultado
│       ├── TranscriptionHistory.tsx  # Historico/lista
│       └── TranscriptionSegment.tsx  # Bloco de fala individual
├── hooks/
│   └── useTranscriptions.ts          # Hooks de dados
└── lib/
    └── transcriptionUtils.ts         # Utilitarios

supabase/
└── functions/
    └── transcribe-video/
        └── index.ts                  # Edge function
```

---

## Detalhes Tecnicos

### API ElevenLabs Scribe v2

Endpoint: `POST https://api.elevenlabs.io/v1/speech-to-text`

Request:
```
Content-Type: multipart/form-data
- file: arquivo de audio
- model_id: "scribe_v2"
- diarize: true
- language_code: "por" (ISO 639-3 para Portugues)
- tag_audio_events: true (opcional - detecta risadas, aplausos)
```

Response:
```json
{
  "text": "Transcricao completa...",
  "words": [
    {
      "text": "palavra",
      "start": 0.5,
      "end": 0.8,
      "speaker": "speaker_1"
    }
  ]
}
```

### Limitacoes Conhecidas

- Tamanho maximo de arquivo: 100MB (storage bucket)
- Tempo maximo de transcricao: depende do plano ElevenLabs
- Diarizacao identifica "Pessoa 1", "Pessoa 2", etc. (nao nomes reais)

---

## Ordem de Implementacao

1. **Conectar ElevenLabs** - Obter API key via conector
2. **Migracoes SQL** - Bucket de storage + tabela de transcricoes
3. **Edge Function** - `transcribe-video` com logica principal
4. **Hook** - `useTranscriptions` para gerenciar estado
5. **Componentes UI** - Upload, Resultado, Historico
6. **Pagina Principal** - `TranscricoesView`
7. **Integracao Posts** - Botao em videos existentes
8. **Navegacao** - Adicionar ao menu e rotas

---

## Metricas de Sucesso

- Transcricoes geradas com sucesso
- Tempo medio de processamento
- Taxa de erro
- Uso por tipo (upload vs video interno)

Todas as metricas podem ser extraidas da tabela `transcriptions` via queries SQL.
