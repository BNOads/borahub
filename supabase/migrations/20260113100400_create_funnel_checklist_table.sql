-- Criar tabela funnel_checklist para checklist operacional do funil

CREATE TABLE IF NOT EXISTS public.funnel_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER update_funnel_checklist_updated_at
  BEFORE UPDATE ON public.funnel_checklist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índice para busca por funil (ordenado)
CREATE INDEX IF NOT EXISTS idx_funnel_checklist_funnel_id ON public.funnel_checklist(funnel_id, order_index);

-- RLS
ALTER TABLE public.funnel_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON public.funnel_checklist FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.funnel_checklist FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.funnel_checklist FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all" ON public.funnel_checklist FOR DELETE USING (true);

-- Função para criar checklist padrão ao criar funil
CREATE OR REPLACE FUNCTION create_default_funnel_checklist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.funnel_checklist (funnel_id, title, order_index) VALUES
    (NEW.id, 'Configurar Pixel e API', 0),
    (NEW.id, 'Criar planilha de leads com UTM', 1),
    (NEW.id, 'Criar planilha de vendas', 2),
    (NEW.id, 'Criar pesquisa do lançamento', 3),
    (NEW.id, 'Testar página de obrigado', 4),
    (NEW.id, 'Conferir emails automáticos', 5),
    (NEW.id, 'Definir etapas do funil', 6),
    (NEW.id, 'Criar UTMs orgânicas', 7),
    (NEW.id, 'Enviar checklist de criativos', 8);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar checklist padrão
CREATE TRIGGER trigger_create_default_funnel_checklist
  AFTER INSERT ON public.funnels
  FOR EACH ROW EXECUTE FUNCTION create_default_funnel_checklist();
