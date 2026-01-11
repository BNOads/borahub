-- Tabela de Acessos e Logins (Senhas Úteis)
CREATE TABLE IF NOT EXISTS public.acessos_logins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_acesso TEXT NOT NULL,
    categoria TEXT NOT NULL,
    login_usuario TEXT NOT NULL,
    senha_criptografada TEXT NOT NULL,
    link_acesso TEXT,
    notas_adicionais TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.acessos_logins ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Permitir leitura para todos os autenticados" ON public.acessos_logins;
CREATE POLICY "Permitir leitura para todos os autenticados" 
ON public.acessos_logins FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.acessos_logins;
CREATE POLICY "Permitir inserção para autenticados" 
ON public.acessos_logins FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.acessos_logins;
CREATE POLICY "Permitir atualização para autenticados" 
ON public.acessos_logins FOR UPDATE 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir delete para autenticados" ON public.acessos_logins;
CREATE POLICY "Permitir delete para autenticados" 
ON public.acessos_logins FOR DELETE 
TO authenticated 
USING (true);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_acessos_logins_updated_at ON public.acessos_logins;
CREATE TRIGGER update_acessos_logins_updated_at
BEFORE UPDATE ON public.acessos_logins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
