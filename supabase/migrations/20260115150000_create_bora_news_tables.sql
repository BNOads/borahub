-- Criar tabela bora_news para central de avisos e notícias
CREATE TABLE IF NOT EXISTS public.bora_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  resumo TEXT,
  autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome TEXT NOT NULL DEFAULT 'Admin',
  data_publicacao TIMESTAMPTZ DEFAULT NOW(),
  status_publicacao TEXT NOT NULL DEFAULT 'rascunho' CHECK (status_publicacao IN ('rascunho', 'publicado')),
  destaque BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela bora_news_leitura para controle de leitura por usuário
CREATE TABLE IF NOT EXISTS public.bora_news_leitura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bora_news_id UUID NOT NULL REFERENCES public.bora_news(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  lido BOOLEAN DEFAULT false,
  data_leitura TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bora_news_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bora_news_status ON public.bora_news(status_publicacao, data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_bora_news_destaque ON public.bora_news(destaque, data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_bora_news_leitura_user ON public.bora_news_leitura(user_id, bora_news_id);
CREATE INDEX IF NOT EXISTS idx_bora_news_leitura_news ON public.bora_news_leitura(bora_news_id);

-- RLS
ALTER TABLE public.bora_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bora_news_leitura ENABLE ROW LEVEL SECURITY;

-- Políticas para bora_news (todos podem ler, apenas admins podem modificar)
CREATE POLICY "Allow read published bora_news" ON public.bora_news FOR SELECT USING (true);
CREATE POLICY "Allow insert bora_news" ON public.bora_news FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update bora_news" ON public.bora_news FOR UPDATE USING (true);
CREATE POLICY "Allow delete bora_news" ON public.bora_news FOR DELETE USING (true);

-- Políticas para bora_news_leitura (usuários gerenciam sua própria leitura)
CREATE POLICY "Allow read bora_news_leitura" ON public.bora_news_leitura FOR SELECT USING (true);
CREATE POLICY "Allow insert bora_news_leitura" ON public.bora_news_leitura FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update bora_news_leitura" ON public.bora_news_leitura FOR UPDATE USING (true);
CREATE POLICY "Allow delete bora_news_leitura" ON public.bora_news_leitura FOR DELETE USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_bora_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bora_news_updated_at
  BEFORE UPDATE ON public.bora_news
  FOR EACH ROW
  EXECUTE FUNCTION update_bora_news_updated_at();
