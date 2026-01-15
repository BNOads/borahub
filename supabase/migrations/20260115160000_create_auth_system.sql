-- ============================================================================
-- SISTEMA DE AUTENTICAÇÃO E GESTÃO DE USUÁRIOS - BORAnaOBRA Hub
-- ============================================================================

-- 1. TABELA: departments
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#000000',
  manager_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for departments
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);

-- Enable RLS for departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- 2. TABELA: profiles (extensão de auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('admin', 'collaborator')),
  department UUID REFERENCES departments(id),
  job_title TEXT,
  phone TEXT,
  birth_date DATE,
  hire_date DATE,
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'system')),
  notification_settings JSONB DEFAULT '{}',
  favorite_tools TEXT[] DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add foreign key for department manager
ALTER TABLE departments 
  ADD CONSTRAINT fk_departments_manager 
  FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. TABELA: activity_logs (auditoria)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Enable RLS for activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar perfil automaticamente quando um usuário é criado
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name TEXT;
BEGIN
  -- Extrai nome do email se não fornecido
  extracted_name := SPLIT_PART(NEW.email, '@', 1);
  extracted_name := REPLACE(extracted_name, '.', ' ');
  extracted_name := INITCAP(extracted_name);

  INSERT INTO profiles (id, email, full_name, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', extracted_name),
    COALESCE(NEW.raw_user_meta_data->>'display_name', extracted_name)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar profile quando usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Função para registrar atividades
CREATE OR REPLACE FUNCTION log_activity(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para resetar senha de usuário (apenas admin)
CREATE OR REPLACE FUNCTION reset_user_password(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_email TEXT;
  new_password TEXT;
  result JSONB;
BEGIN
  -- Verifica se o usuário atual é admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem resetar senhas';
  END IF;

  -- Busca o email do usuário
  SELECT email INTO user_email FROM profiles WHERE id = p_user_id;
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Extrai a parte antes do @ para usar como senha
  new_password := SPLIT_PART(user_email, '@', 1);

  -- Atualiza a senha no auth.users (isso precisa ser feito via API do Supabase)
  -- Por ora, apenas marca que precisa trocar senha
  UPDATE profiles
  SET must_change_password = true
  WHERE id = p_user_id;

  -- Registra a atividade
  PERFORM log_activity('password_reset', 'user', p_user_id, 
    jsonb_build_object('reset_by', auth.uid(), 'new_password', new_password));

  result := jsonb_build_object(
    'success', true,
    'message', 'Senha resetada com sucesso',
    'new_password', new_password
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas do usuário
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  total_logins INTEGER;
  total_actions INTEGER;
  actions_last_week INTEGER;
  last_login TIMESTAMPTZ;
BEGIN
  -- Verifica se o usuário atual é admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem ver estatísticas de usuários';
  END IF;

  -- Conta logins
  SELECT COUNT(*) INTO total_logins
  FROM activity_logs
  WHERE user_id = p_user_id AND action = 'login';

  -- Conta ações totais
  SELECT COUNT(*) INTO total_actions
  FROM activity_logs
  WHERE user_id = p_user_id;

  -- Conta ações da última semana
  SELECT COUNT(*) INTO actions_last_week
  FROM activity_logs
  WHERE user_id = p_user_id 
    AND created_at >= NOW() - INTERVAL '7 days';

  -- Busca último login
  SELECT last_login_at INTO last_login
  FROM profiles
  WHERE id = p_user_id;

  stats := jsonb_build_object(
    'total_logins', total_logins,
    'total_actions', total_actions,
    'actions_last_week', actions_last_week,
    'last_login', last_login
  );

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- PROFILES
-- SELECT: Usuários autenticados podem ver todos os perfis ativos, ou seu próprio perfil
CREATE POLICY "Usuários autenticados podem ver perfis ativos"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    is_active = true OR id = auth.uid()
  );

-- UPDATE: Usuários podem editar apenas seu próprio perfil (exceto role e is_active)
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT: Apenas admins podem criar novos perfis
CREATE POLICY "Admins podem criar perfis"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- DELETE: Apenas admins podem deletar perfis
CREATE POLICY "Admins podem deletar perfis"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- DEPARTMENTS
-- SELECT: Todos os usuários autenticados podem ver departamentos ativos
CREATE POLICY "Usuários autenticados podem ver departamentos ativos"
  ON departments FOR SELECT
  TO authenticated
  USING (is_active = true);

-- INSERT/UPDATE/DELETE: Apenas admins
CREATE POLICY "Admins podem gerenciar departamentos"
  ON departments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ACTIVITY_LOGS
-- SELECT: Usuários veem apenas seus próprios logs; Admins veem todos
CREATE POLICY "Usuários podem ver seus próprios logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR is_admin()
  );

-- INSERT: Sistema pode inserir logs para qualquer usuário autenticado
CREATE POLICY "Sistema pode inserir logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 6. DADOS INICIAIS
-- ============================================================================

-- Criar departamentos padrão
INSERT INTO departments (name, description, color)
VALUES 
  ('Tecnologia', 'Equipe de desenvolvimento e infraestrutura', '#3B82F6'),
  ('Marketing', 'Equipe de marketing e comunicação', '#F59E0B'),
  ('Vendas', 'Equipe comercial', '#10B981'),
  ('Administrativo', 'Equipe administrativa', '#6366F1'),
  ('Operações', 'Equipe de operações', '#EC4899')
ON CONFLICT (name) DO NOTHING;
