
# Bloco de Notas Flutuante

Funcionalidade que permite aos usuarios salvar notas rapidas com 1 clique, persistindo no banco de dados e acessiveis via botao flutuante e na pagina de Acesso Rapido.

---

## Visao Geral

O usuario tera um botao flutuante (como na imagem de referencia) no canto inferior direito da tela. Ao clicar, abre um painel para escrever/editar sua nota pessoal. A nota e salva automaticamente e fica disponivel em toda a plataforma.

```text
+----------------------------------+
|           Header                 |
+----------------------------------+
|                                  |
|         Conteudo                 |
|                                  |
|                          [Nota]  | <-- Botao flutuante
+----------------------------------+
|         BottomNav (mobile)       |
+----------------------------------+
```

---

## Componentes a Criar

### 1. Botao Flutuante de Notas
- Posicao fixa no canto inferior direito
- Icone de lapis/nota (similar a imagem)
- Animacao de hover/pulse
- No mobile: acima do BottomNav

### 2. Painel de Notas
- Abre ao clicar no botao flutuante
- Textarea expansivel
- Salvamento automatico (debounce 1s)
- Indicador de status (salvando/salvo)
- Botao de fechar

### 3. Widget no Acesso Rapido
- Card destacado mostrando a nota atual
- Acesso rapido para editar
- Preview do conteudo truncado

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/notes/FloatingNoteButton.tsx` | Botao flutuante global |
| `src/components/notes/NotePanel.tsx` | Painel de edicao da nota |
| `src/hooks/useUserNotes.ts` | Hook para CRUD das notas |

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/layout/MainLayout.tsx` | Adicionar FloatingNoteButton |
| `src/pages/AcessoRapido.tsx` | Adicionar widget de nota |

---

## Detalhes Tecnicos

### Tabela no Banco de Dados

```sql
CREATE TABLE user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cada usuario tem apenas 1 nota (bloco de notas unico)
CREATE UNIQUE INDEX user_notes_user_id_unique ON user_notes(user_id);

-- RLS: usuario so ve/edita sua propria nota
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notes"
  ON user_notes FOR ALL
  USING (user_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_user_notes_updated_at
  BEFORE UPDATE ON user_notes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

### Hook useUserNotes

```typescript
// Funcionalidades:
// - useUserNote(): busca a nota do usuario atual
// - useSaveNote(): salva/atualiza a nota com upsert
// - Debounce de 1 segundo no salvamento
```

### FloatingNoteButton

```typescript
// Caracteristicas:
// - Posicao: fixed bottom-20 right-4 (mobile) / bottom-8 right-8 (desktop)
// - Z-index alto (z-40)
// - Animacao de pulse quando ha conteudo
// - Abre Sheet lateral (mobile) ou Popover (desktop)
```

### Estrutura do Componente

```text
FloatingNoteButton
└── Collapsible/Sheet
    └── NotePanel
        ├── Header (titulo + status + fechar)
        ├── Textarea (auto-resize)
        └── Footer (contador de caracteres)
```

---

## Fluxo de Uso

1. Usuario clica no botao flutuante azul
2. Painel abre com a nota atual (ou vazia)
3. Usuario digita/edita o conteudo
4. Apos 1s sem digitar, salva automaticamente
5. Indicador mostra "Salvando..." / "Salvo"
6. Ao fechar, conteudo persiste
7. Na pagina Ferramentas, ve preview da nota

---

## UX/UI

- **Cor do botao**: Azul primario (como na imagem)
- **Icone**: Pencil ou StickyNote do lucide-react
- **Animacao**: Scale no hover, pulse sutil quando tem conteudo
- **Responsivo**: Sheet no mobile, Popover no desktop
- **Dark mode**: Funciona com tema atual

---

## Ordem de Implementacao

1. Criar tabela `user_notes` no banco
2. Criar hook `useUserNotes.ts`
3. Criar componente `NotePanel.tsx`
4. Criar componente `FloatingNoteButton.tsx`
5. Adicionar FloatingNoteButton no `MainLayout.tsx`
6. Adicionar widget de nota no `AcessoRapido.tsx`
7. Testar fluxo completo
