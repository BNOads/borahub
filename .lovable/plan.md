
# Plano: Melhorar Qualidade da Transcrição

## Problema Identificado
O modelo `whisper-tiny` (~40MB) é o menor e mais rápido, mas tem precisão muito limitada, especialmente para português. O resultado mostrado na imagem demonstra isso - frases incompletas e sem sentido.

## Comparação de Modelos Whisper

| Modelo | Tamanho | Precisão (PT) | Download |
|--------|---------|---------------|----------|
| whisper-tiny | ~40MB | Baixa | Rápido |
| whisper-base | ~75MB | Média | Moderado |
| whisper-small | ~245MB | Boa | Lento (1ª vez) |

## Solução Proposta

### 1. Trocar para modelo `whisper-base`
Usar `onnx-community/whisper-base` em vez de `whisper-tiny`. É um bom equilíbrio entre:
- Tamanho: ~75MB (não muito grande para download)
- Precisão: Significativamente melhor que tiny para português
- Performance: Ainda processável em CPU/WASM

### 2. Adicionar parâmetro `task: "transcribe"`
Forçar o modo de transcrição (não tradução) para garantir que o áudio português seja transcrito em português.

### 3. Opção de modelo avançado
Oferecer opção para o usuário escolher entre modelos:
- **Base** (padrão): Mais rápido, boa qualidade
- **Small**: Mais lento, melhor qualidade para áudios complexos

---

## Alterações Técnicas

### Arquivo: `src/lib/whisperTranscriber.ts`

```typescript
// Trocar modelo
transcriber = await pipeline(
  "automatic-speech-recognition",
  "onnx-community/whisper-base",  // Era whisper-tiny
  {
    device: "wasm",
    progress_callback: ...
  }
);

// Adicionar task na transcrição
const result = await pipe(audioUrl, {
  return_timestamps: true,
  language: langMap[language] || langMap.pt,
  task: "transcribe",  // NOVO - força transcrição
  chunk_length_s: 30,
  stride_length_s: 5,
});
```

### Arquivo: `src/components/transcricoes/TranscriptionUpload.tsx`
Atualizar mensagem sobre tempo de download (modelo maior = download mais lento na primeira vez).

---

## Resultado Esperado
- Transcrição significativamente mais precisa em português
- Download inicial um pouco mais demorado (~75MB vs ~40MB)
- Processamento ligeiramente mais lento, mas ainda aceitável
- Modelo fica em cache no navegador após primeiro uso

## Arquivos a Modificar
1. `src/lib/whisperTranscriber.ts` - Trocar modelo e adicionar `task`
2. `src/components/transcricoes/TranscriptionUpload.tsx` - Atualizar texto informativo
