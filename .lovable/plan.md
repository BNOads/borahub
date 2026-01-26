
## Plano: Botão de Voltar com Navegação por Histórico

### Problema Atual

Os botões de "Voltar" estão configurados com rotas fixas (ex: `/tarefas`, `/funis`, `/treinamentos`), em vez de usar o histórico do navegador. Isso significa que se um usuário vier de uma tela diferente, ao clicar em "Voltar" ele vai para a rota fixa e não para onde estava antes.

### Solução

Substituir as navegações fixas por `navigate(-1)`, que utiliza o histórico do navegador para voltar à última tela visitada.

---

### Arquivos a Modificar

| Arquivo | Navegação Atual | Linha(s) |
|---------|-----------------|----------|
| `src/pages/TarefaDetalhe.tsx` | `Link to="/tarefas"` | ~226, ~244 |
| `src/pages/PDIDetalhe.tsx` | `navigate("/pdis")` | ~97, ~268 |
| `src/pages/CursoDetalhes.tsx` | `Link to="/treinamentos"` | ~117-121 |
| `src/pages/AulaView.tsx` | `Link to={/treinamentos/${courseId}}` | ~120-124 |
| `src/pages/BoraNewsDetail.tsx` | `Link to="/bora-news"` | ~47, ~60 |
| `src/pages/QuizBuilder.tsx` | `navigate("/quizzes")` | ~278, ~319 |
| `src/pages/QuizAnalytics.tsx` | `navigate("/quizzes")` | ~111, ~234 |
| `src/pages/FunnelDetails.tsx` | `navigate("/funis")` | ~121 |
| `src/pages/Perfil.tsx` | `navigate('/')` | ~216 |
| `src/components/funnel-panel/FunnelPanelHeader.tsx` | `navigate("/funis")` | ~77 |

---

### Detalhes Técnicos

**Padrão da Correção para Botões com `onClick`:**

```typescript
// ANTES (rota fixa)
<Button variant="ghost" size="icon" onClick={() => navigate("/pdis")}>
  <ArrowLeft className="h-5 w-5" />
</Button>

// DEPOIS (histórico do navegador)
<Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
  <ArrowLeft className="h-5 w-5" />
</Button>
```

**Padrão da Correção para Links:**

```tsx
// ANTES (Link com rota fixa)
<Button variant="ghost" asChild>
  <Link to="/tarefas">
    <ArrowLeft className="h-5 w-5" />
  </Link>
</Button>

// DEPOIS (Button com navigate(-1))
<Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
  <ArrowLeft className="h-5 w-5" />
</Button>
```

**Observação sobre textos de "Voltar para X":**
- Textos como "Voltar para tarefas" ou "Voltar para PDIs" serão simplificados para apenas "Voltar" quando apropriado, já que o destino agora é dinâmico.

---

### Resultado Esperado

Após as correções:
- Clicar no botão "Voltar" sempre retorna para a tela anterior do histórico
- Se o usuário acessar uma tarefa a partir do Dashboard, voltará para o Dashboard
- Se o usuário acessar a mesma tarefa a partir da lista de Tarefas, voltará para a lista de Tarefas
- Comportamento mais intuitivo e consistente com apps modernos
