-- Atualizar função de criação de checklist padrão com mais itens

CREATE OR REPLACE FUNCTION create_default_funnel_checklist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.funnel_checklist (funnel_id, title, order_index) VALUES
    -- Configuração Inicial
    (NEW.id, 'Configuração de turma', 0),
    (NEW.id, 'Definir orçamento', 1),
    (NEW.id, 'Configurar datas do lançamento', 2),
    (NEW.id, 'Fechar datas na agenda', 3),
    -- Preparação de Conteúdo
    (NEW.id, 'Passar briefing pra equipe', 4),
    (NEW.id, 'Criar memorial do lançamento', 5),
    (NEW.id, 'Enviar checklist de criativos', 6),
    -- Configuração Técnica
    (NEW.id, 'Configurar Pixel e API', 7),
    (NEW.id, 'Conferir traqueamento da página de obrigado', 8),
    (NEW.id, 'Conferir email de boas vindas', 9),
    (NEW.id, 'Criar planilha de leads com UTM', 10),
    (NEW.id, 'Criar planilha de vendas', 11),
    -- Marketing e Comunicação
    (NEW.id, 'Criar pesquisa do lançamento', 12),
    (NEW.id, 'Fazer disparo pra base orgânica', 13),
    (NEW.id, 'Trocar foto de perfil do Instagram', 14),
    (NEW.id, 'Atualizar bio do Instagram', 15),
    (NEW.id, 'Criar UTMs orgânicas', 16),
    -- Verificações Finais
    (NEW.id, 'Testar página de obrigado', 17),
    (NEW.id, 'Conferir emails automáticos', 18),
    (NEW.id, 'Definir etapas do funil', 19);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
