-- 1. Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'collaborator', 'manager');

-- 2. Criar enum para recorrência
CREATE TYPE public.recurrence_type AS ENUM ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'semiannual', 'yearly');

-- 3. Departamentos
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Profiles (tabela central de usuários)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  display_name text,
  avatar_url text,
  department_id uuid REFERENCES public.departments(id),
  job_title text,
  phone text,
  birth_date date,
  hire_date date,
  bio text,
  is_active boolean DEFAULT true,
  must_change_password boolean DEFAULT false,
  theme_preference text DEFAULT 'system',
  notification_settings jsonb,
  favorite_tools text[],
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. User Roles (tabela separada para roles - segurança)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'collaborator',
  UNIQUE (user_id, role)
);

-- 6. Função security definer para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 7. Função para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 8. Activity Logs
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- 9. Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES public.profiles(id),
  sender_id uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10. Bora News
CREATE TABLE public.bora_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  resumo text,
  conteudo text NOT NULL,
  autor_id uuid,
  autor_nome text NOT NULL DEFAULT 'Sistema',
  data_publicacao timestamptz DEFAULT now(),
  status_publicacao text DEFAULT 'publicado',
  destaque boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 11. Bora News Leitura
CREATE TABLE public.bora_news_leitura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bora_news_id uuid REFERENCES public.bora_news(id) ON DELETE CASCADE NOT NULL,
  user_id text NOT NULL,
  lido boolean DEFAULT false,
  data_leitura timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 12. Content Settings
CREATE TABLE public.content_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 13. IA Agents
CREATE TABLE public.ia_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text DEFAULT 'geral',
  prompt text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 14. Events (Agenda)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time time NOT NULL,
  duration_minutes integer DEFAULT 60,
  location text,
  meeting_link text,
  color text DEFAULT '#6366f1',
  event_type text DEFAULT 'meeting',
  recurrence recurrence_type DEFAULT 'none',
  recurrence_end_date date,
  parent_event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  is_recurring_instance boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 15. Funnel Links
CREATE TABLE public.funnel_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid REFERENCES public.funnels(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  link_type text NOT NULL,
  url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 16. Funnel Diary
CREATE TABLE public.funnel_diary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid REFERENCES public.funnels(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  author_id uuid,
  author_name text NOT NULL DEFAULT 'Sistema',
  created_at timestamptz DEFAULT now()
);

-- 17. Funnel Checklist
CREATE TABLE public.funnel_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid REFERENCES public.funnels(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  is_completed boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 18. UTM History
CREATE TABLE public.utm_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_url text NOT NULL,
  utm_source text NOT NULL,
  utm_medium text NOT NULL,
  utm_campaign text NOT NULL,
  utm_term text,
  utm_content text,
  full_url text NOT NULL,
  generation_type text DEFAULT 'single',
  batch_id text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 19. Adicionar colunas faltantes na tabela funnels
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS funnel_type text;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS visibility text;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS lesson_type text;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS launch_type text;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS manager text;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS client text;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS ticket_medio numeric;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS leads_goal integer;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS cpl_goal numeric;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS captacao_start date;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS captacao_end date;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS aquecimento_start date;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS aquecimento_end date;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS cpl_start date;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS cpl_end date;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS lembrete_start date;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS carrinho_start date;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS fechamento_date date;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_captacao_percent numeric;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_aquecimento_percent numeric;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_evento_percent numeric;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_venda_percent numeric;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_lembrete_percent numeric;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS budget_impulsionamento_percent numeric;

-- 20. Adicionar colunas faltantes na tabela social_posts
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS arquivos_link text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS big_idea text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS campos_extras jsonb;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS roteiro text;

-- 21. Habilitar RLS em todas as novas tabelas
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bora_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bora_news_leitura ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_history ENABLE ROW LEVEL SECURITY;

-- 22. Policies para departments
CREATE POLICY "Allow all on departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);

-- 23. Policies para profiles
CREATE POLICY "Allow select on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);

-- 24. Policies para user_roles
CREATE POLICY "Allow select on user_roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins can manage user_roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 25. Policies para outras tabelas
CREATE POLICY "Allow all on activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on bora_news" ON public.bora_news FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on bora_news_leitura" ON public.bora_news_leitura FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on content_settings" ON public.content_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ia_agents" ON public.ia_agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on events" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on funnel_links" ON public.funnel_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on funnel_diary" ON public.funnel_diary FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on funnel_checklist" ON public.funnel_checklist FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on utm_history" ON public.utm_history FOR ALL USING (true) WITH CHECK (true);

-- 26. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_bora_news_updated_at BEFORE UPDATE ON public.bora_news FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_content_settings_updated_at BEFORE UPDATE ON public.content_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_ia_agents_updated_at BEFORE UPDATE ON public.ia_agents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_funnel_links_updated_at BEFORE UPDATE ON public.funnel_links FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_funnel_checklist_updated_at BEFORE UPDATE ON public.funnel_checklist FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 27. Trigger para criar profile automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'collaborator');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();