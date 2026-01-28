
# Plano: Passar URL do Vídeo para o Modal de Transcrição

## Problema Identificado
O botão "Transcrever" abre o `TranscribeFromPostModal`, mas **não está passando a URL do vídeo** que está no post. O modal já tem toda a lógica de detectar Google Drive e oferecer download automático, mas precisa receber a prop `videoUrl`.

## Solução Simples

Alterar **uma única linha** no `PostDetailsModal.tsx`:

### Antes (linha 582-587):
```tsx
<TranscribeFromPostModal
    isOpen={showTranscribeModal}
    onClose={() => setShowTranscribeModal(false)}
    onTranscriptionComplete={handleTranscriptionComplete}
    postId={post?.id}
/>
```

### Depois:
```tsx
<TranscribeFromPostModal
    isOpen={showTranscribeModal}
    onClose={() => setShowTranscribeModal(false)}
    onTranscriptionComplete={handleTranscriptionComplete}
    postId={post?.id}
    videoUrl={videoUrl}  // ← Adicionar esta linha
/>
```

## Resultado
Quando o usuário clicar em "Transcrever" em um post com vídeo do Google Drive:
1. O modal vai detectar automaticamente que é um link do Google Drive
2. Vai mostrar o botão "Baixar do Google Drive"
3. Ao clicar, baixa via Edge Function
4. Transcreve automaticamente
5. Insere no roteiro

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/conteudo/PostDetailsModal.tsx` | Passar prop `videoUrl` para o modal |
