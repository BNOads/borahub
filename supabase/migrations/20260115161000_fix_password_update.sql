-- Fix para autenticação: ajustar função de troca de senha

-- Atualizar função para atualizar senha sem verificar a atual (para troca obrigatória)
CREATE OR REPLACE FUNCTION update_password_force(p_new_password TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Atualiza a senha do usuário atual
  -- Nota: Isso deve ser feito via API do Supabase Auth em produção
  -- Esta função é apenas para marcar que a senha foi alterada
  
  UPDATE profiles
  SET must_change_password = false
  WHERE id = auth.uid();

  -- Registra a atividade
  PERFORM log_activity('password_change', 'auth', NULL, NULL);

  result := jsonb_build_object(
    'success', true,
    'message', 'Senha atualizada com sucesso'
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant para usuários autenticados
GRANT EXECUTE ON FUNCTION update_password_force(TEXT) TO authenticated;
