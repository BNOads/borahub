
# Plano: Botão de Transcrição no Card de Post

## Resumo
Adicionar um botão "Transcrever" diretamente na seção de mídia do post no `PostDetailsModal`. Quando clicado, o sistema vai transcrever o vídeo usando a ferramenta Whisper local existente e trazer a transcrição para o campo de roteiro do post.

## Como Vai Funcionar

1. O usuário cola um link de vídeo (Google Drive, YouTube, Vimeo)
2. Aparece um botão "Transcrever" ao lado do vídeo
3. Ao clicar, abre um modal/sheet com as opções de idioma
4. A transcrição é processada localmente com Whisper
5. Ao concluir, a transcrição é automaticamente inserida no campo "Roteiro" do post
6. Opcionalmente, a transcrição fica salva no histórico (vinculada ao post)

## Desafio Técnico

A ferramenta atual de transcrição trabalha com **upload de arquivo local**, mas aqui temos **URLs de vídeos hospedados** (Google Drive, YouTube, Vimeo). 

Existem duas abordagens:

**Opção A: Transcrição com download prévio**
- Baixar o vídeo localmente (via fetch) antes de transcrever
- Problema: CORS pode bloquear downloads de Drive/YouTube
- Funcionaria bem apenas para arquivos hospedados em serviços que permitem CORS

**Opção B: Solicitar upload manual**
- Ao clicar "Transcrever", abrir modal pedindo para o usuário fazer upload do arquivo
- O arquivo é transcrito e vinculado ao post
- Mais confiável, funciona com qualquer fonte

**Recomendação**: Usar **Opção B** por ser mais confiável e não depender de CORS dos provedores externos.

---

## Alterações Técnicas

### 1. Criar componente `TranscribeFromPostModal`
Novo componente em `src/components/conteudo/TranscribeFromPostModal.tsx`

Funcionalidades:
- Modal/Dialog para configurar transcrição
- Upload de arquivo de áudio/vídeo
- Seleção de idioma
- Barra de progresso durante processamento
- Ao concluir, insere transcrição no roteiro e salva

```text
┌─────────────────────────────────────────────┐
│  📝 Transcrever Vídeo                       │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Arraste o arquivo ou clique para   │   │
│  │  selecionar o áudio/vídeo           │   │
│  │  (arquivo do vídeo embedado)        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Idioma: [Português ▼]                      │
│                                             │
│  [ Cancelar ]      [ Transcrever ]          │
│                                             │
└─────────────────────────────────────────────┘
```

### 2. Atualizar `PostDetailsModal.tsx`

**Adicionar imports:**
- Ícone `Mic` do lucide-react
- Novo modal `TranscribeFromPostModal`

**Adicionar state:**
```typescript
const [showTranscribeModal, setShowTranscribeModal] = useState(false);
```

**Adicionar botão na seção de mídia:**
Na linha após o VideoEmbed (linha ~443), adicionar botão:
```typescript
{videoUrl && !getMediaInfo(videoUrl).isImage && (
  <Button 
    variant="outline" 
    size="sm"
    onClick={() => setShowTranscribeModal(true)}
  >
    <Mic className="h-4 w-4 mr-2" />
    Transcrever
  </Button>
)}
```

**Adicionar callback:**
```typescript
function handleTranscriptionComplete(text: string) {
  setRoteiro(prevRoteiro => 
    prevRoteiro ? `${prevRoteiro}\n\n--- Transcrição ---\n${text}` : text
  );
  setShowTranscribeModal(false);
  toast.success("Transcrição adicionada ao roteiro!");
}
```

### 3. Atualizar hook `useCreateTranscription`
Modificar para aceitar parâmetro opcional `onComplete` que retorna o texto transcrito diretamente.

---

## Fluxo do Usuário

```text
1. Usuário abre card do post
        │
        ▼
2. Cola link do vídeo (Drive/YouTube/Vimeo)
        │
        ▼
3. Vídeo é exibido com botão "Transcrever"
        │
        ▼
4. Clica "Transcrever" → abre modal
        │
        ▼
5. Faz upload do arquivo de vídeo/áudio
        │
        ▼
6. Seleciona idioma → clica "Transcrever"
        │
        ▼
7. Whisper processa localmente (~1-3 min)
        │
        ▼
8. Transcrição inserida no campo "Roteiro"
        │
        ▼
9. Usuário pode editar e clicar "Salvar"
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/conteudo/TranscribeFromPostModal.tsx` | Criar |
| `src/components/conteudo/PostDetailsModal.tsx` | Modificar |

---

## Resultado Esperado

- Botão "Transcrever" aparece quando há vídeo no post (não imagem)
- Modal permite upload do arquivo correspondente ao vídeo
- Transcrição é processada localmente com Whisper
- Texto transcrito é automaticamente adicionado ao campo "Roteiro"
- Transcrição também fica salva no histórico (vinculada ao post via `source_type: "post"` e `source_id`)
