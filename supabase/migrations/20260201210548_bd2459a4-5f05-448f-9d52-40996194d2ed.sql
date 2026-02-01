
-- Adicionar policy para permitir que todos os usuários autenticados vejam comissões
-- (necessário para relatórios e dashboards funcionarem corretamente)

DROP POLICY IF EXISTS "Users can view commissions" ON public.commissions;

CREATE POLICY "All authenticated users can view commissions"
  ON public.commissions
  FOR SELECT
  TO authenticated
  USING (true);
