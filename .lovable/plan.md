# Melhorias no Criador de UTM

## O que vai mudar

### 1. Link UTM em tempo real (Live Preview)

Conforme o usuario preenche os campos (URL, campanha, source, medium, etc.), o link UTM completo aparece automaticamente abaixo do formulario, se construindo ao vivo -- sem precisar clicar em nenhum botao.

### 2. Botao "Criar Redirect"

Um botao que gera um link curto personalizado usando o dominio `app.boranaobra.org`. Exemplo:

- UTM original: `https://seusite.com/pagina?utm_source=instagram&utm_medium=feed&utm_campaign=lancamento`
- Link Direct gerado: `app.naobra.org/d/abc123`

Ao acessar esse link, o usuario e redirecionado para a URL completa com UTMs.

### 3. Lista de Direct Links criados

Uma secao que exibe todos os links Direct salvos, com opcao de copiar.

---

## Detalhes Tecnicos

### Nova tabela no banco: `direct_links`

```sql
CREATE TABLE public.direct_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  target_url TEXT NOT NULL,
  utm_history_id UUID REFERENCES public.utm_history(id),
  created_by UUID REFERENCES auth.users(id),
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS policies para usuarios autenticados
```

### Edge Function: `redirect-direct`

Recebe o slug, busca o `target_url` no banco, incrementa o contador de cliques, e retorna um redirect 302.

### Alteracoes em `src/pages/UtmCreator.tsx`

1. **Live Preview**: Um `useMemo` que calcula o link UTM sempre que qualquer campo muda. Exibido em um card abaixo do formulario com botao de copiar.
2. **Botao "Criar Direct"**: Aparece ao lado do link preview. Gera um slug unico (6 caracteres), salva na tabela `direct_links`, e exibe o link curto.
3. **Secao "Meus Direct Links"**: Lista com slug, URL de destino, data de criacao e botao copiar. Carregada da tabela `direct_links`.

### Fluxo do redirect

O link `app.boranaobra.org/d/:slug` sera tratado por uma rota no React que:

- Busca o slug na tabela `direct_links`
- Incrementa `click_count`
- Redireciona via `window.location.href` para a `target_url`