-- Tabela de documentos do Guia de Sobrevivência
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'Sem Título',
    content TEXT DEFAULT '', -- Armazena o HTML/JSON do editor
    icon TEXT DEFAULT '📄', -- Emoji ou nome de ícone Lucide
    cover_url TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    share_slug TEXT UNIQUE DEFAULT gen_random_uuid()::text,
    category TEXT DEFAULT 'Geral',
    author_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Para fins de MVP, permitimos que usuários autenticados gerenciem todos os documentos
-- No futuro, isso pode ser restrito por author_id ou roles
CREATE POLICY "Enable all access for authenticated users on documents" ON public.documents
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Permitir leitura pública para documentos marcados como is_public
CREATE POLICY "Enable public access for shared documents" ON public.documents
    FOR SELECT
    USING (is_public = true);

-- Inserir alguns exemplos iniciais
INSERT INTO public.documents (title, content, icon, category, is_public)
VALUES 
('Código de Cultura', '<h1>Nossa Cultura</h1><p>Aqui na Borahub, acreditamos em transparência e agilidade...</p>', '🎯', 'Cultura', true),
('Dados da Empresa', '<h1>Informações Corporativas</h1><p>CNPJ: 00.000.000/0001-00</p><p>Endereço: Nuvem</p>', '🏢', 'Administrativo', false),
('História da Empresa', '<h1>Nossa Jornada</h1><p>Tudo começou com um sonho em 2024...</p>', '📜', 'História', true);
