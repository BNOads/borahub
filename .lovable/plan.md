

# Plano: Melhorar Visibilidade do Progresso de Transcrição

## Problema Atual
O popup de transcrição mostra o progresso de forma compacta e pouco destacada quando está processando. A barra de progresso é pequena (h-2) e as informações ficam misturadas com os outros elementos.

## Melhorias Propostas

### 1. Layout de Progresso Expandido
Quando estiver processando, transformar toda a área central em um painel de progresso destacado:

```text
┌─────────────────────────────────────────────┐
│  🎙️ Transcrever Vídeo                  ✕   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │   🎵  arquivo.mp4                   │   │
│  │       50.5 MB                       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │         ⟳  (animação giratória)    │   │
│  │                                     │   │
│  │          【████████░░░░】           │   │
│  │              50%                    │   │
│  │                                     │   │
│  │      Transcrevendo áudio...         │   │
│  │                                     │   │
│  │  Processando localmente...          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│           [ Cancelar ]                      │
│                                             │
└─────────────────────────────────────────────┘
```

### 2. Alterações Visuais

| Elemento | Antes | Depois |
|----------|-------|--------|
| Barra de progresso | `h-2` | `h-3` ou `h-4` |
| Percentual | Pequeno ao lado | Grande e centralizado |
| Ícone de loading | Pequeno no botão | Grande e centralizado |
| Área de progresso | Inline | Card destacado com fundo |
| Status | Texto pequeno | Texto maior e em destaque |

### 3. Implementação

**Modificar `TranscribeFromPostModal.tsx`:**

Substituir a seção de progresso por uma versão mais visível:

```tsx
{isProcessing && (
  <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center space-y-4">
    {/* Ícone animado grande */}
    <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
    </div>
    
    {/* Percentual grande */}
    <div className="text-3xl font-bold text-primary">
      {Math.round(progress)}%
    </div>
    
    {/* Barra de progresso maior */}
    <Progress value={progress} className="h-3" />
    
    {/* Status */}
    <div className="space-y-1">
      <p className="font-medium">{statusMessage}</p>
      <p className="text-xs text-muted-foreground">
        {progress < 20
          ? "Na primeira vez, o modelo (~75MB) será baixado e ficará em cache."
          : "Processando localmente no seu navegador..."}
      </p>
    </div>
  </div>
)}
```

### 4. Esconder Seletor de Idioma Durante Processamento
Quando estiver processando, ocultar o seletor de idioma para dar mais espaço ao progresso.

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/conteudo/TranscribeFromPostModal.tsx` | Redesign da seção de progresso |

## Resultado Esperado
- Área de progresso maior e mais destacada visualmente
- Percentual grande e centralizado (fácil de ver de relance)
- Ícone de loading maior e animado
- Barra de progresso mais espessa
- Layout limpo durante processamento (sem elementos desnecessários)

