-- Torna a tabela de acessos acessível para todos os usuários (incluindo anon) para facilitar o desenvolvimento/teste
DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.acessos_logins;
DROP POLICY IF EXISTS "Permitir leitura para todos os autenticados" ON public.acessos_logins;
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.acessos_logins;
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.acessos_logins;
DROP POLICY IF EXISTS "Permitir delete para autenticados" ON public.acessos_logins;

CREATE POLICY "Acesso total para todos" 
ON public.acessos_logins FOR ALL 
USING (true) 
WITH CHECK (true);
