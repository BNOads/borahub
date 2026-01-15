-- =====================================================
-- 1. ATUALIZAR TIPOS DE LINKS PARA INCLUIR "MEMORIAL"
-- =====================================================

-- Remover constraint antiga e adicionar nova com memorial
ALTER TABLE public.funnel_links DROP CONSTRAINT IF EXISTS funnel_links_link_type_check;
ALTER TABLE public.funnel_links ADD CONSTRAINT funnel_links_link_type_check
  CHECK (link_type IN ('captura', 'vendas', 'leads', 'compradores', 'drive', 'criativos', 'pesquisa', 'memorial', 'custom'));

-- =====================================================
-- 2. CRIAR LINKS AUTOMÁTICOS QUANDO FUNIL FOR CRIADO
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_funnel_links()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.funnel_links (funnel_id, name, link_type) VALUES
    (NEW.id, 'Página de Captura', 'captura'),
    (NEW.id, 'Página de Vendas / Checkout', 'vendas'),
    (NEW.id, 'Planilha de Leads', 'leads'),
    (NEW.id, 'Planilha de Compradores', 'compradores'),
    (NEW.id, 'Pasta do Drive do Lançamento', 'drive'),
    (NEW.id, 'Formulário de Pesquisa / NPS', 'pesquisa'),
    (NEW.id, 'Biblioteca de Criativos', 'criativos'),
    (NEW.id, 'Memorial', 'memorial');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar links padrão
DROP TRIGGER IF EXISTS trigger_create_default_funnel_links ON public.funnels;
CREATE TRIGGER trigger_create_default_funnel_links
  AFTER INSERT ON public.funnels
  FOR EACH ROW EXECUTE FUNCTION create_default_funnel_links();

-- =====================================================
-- 3. ADICIONAR COLUNA DESCRIPTION NO CHECKLIST
-- =====================================================

ALTER TABLE public.funnel_checklist ADD COLUMN IF NOT EXISTS description TEXT;

-- =====================================================
-- 4. ATUALIZAR FUNÇÃO DO CHECKLIST COM DESCRIÇÕES
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_funnel_checklist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.funnel_checklist (funnel_id, title, description, order_index) VALUES
    (NEW.id, 'Configurar Pixel e API', 'Configurar pixels de rastreamento e integrações de API', 0),
    (NEW.id, 'Testar página de obrigado', 'Verificar se a página de agradecimento está funcionando corretamente', 1),
    (NEW.id, 'Criar planilha de leads UTM', 'Configurar planilha para rastreamento de leads com parâmetros UTM', 2),
    (NEW.id, 'Criar planilha de vendas', 'Configurar planilha para controle de vendas', 3),
    (NEW.id, 'Criar pesquisa para o lançamento', 'Criar formulário de pesquisa para coletar feedback', 4),
    (NEW.id, 'Conferir email de boas-vindas', 'Revisar e testar email automático de boas-vindas', 5),
    (NEW.id, 'Conferir CPL das aulas', 'Verificar e validar o custo por lead de cada aula do lançamento', 6),
    (NEW.id, 'Conferir quais etapas do lançamento terá', 'Definir se terá Aquecimento, Lembrete e Remarketing', 7),
    (NEW.id, 'Enviar pro cliente Checklist de criativos', 'Compartilhar o checklist de criativos com o cliente', 8),
    (NEW.id, 'Criar UTMs orgânicas para o lançamento', 'Configurar UTMs para rastreamento de tráfego orgânico', 9);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
