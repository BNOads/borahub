-- =============================================
-- MENTORIA BORA ACELERAR - Tabelas e Dados Iniciais
-- =============================================

-- Tabela de Processos (templates reutilizáveis)
CREATE TABLE public.mentoria_processos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Etapas dentro de cada processo
CREATE TABLE public.mentoria_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES public.mentoria_processos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Tarefas dentro de cada etapa
CREATE TABLE public.mentoria_tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID NOT NULL REFERENCES public.mentoria_etapas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  mentorado_nome TEXT,
  parent_tarefa_id UUID REFERENCES public.mentoria_tarefas(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.mentoria_processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentoria_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentoria_tarefas ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Acesso para todos autenticados
CREATE POLICY "Authenticated users can view processos"
ON public.mentoria_processos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create processos"
ON public.mentoria_processos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update processos"
ON public.mentoria_processos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete processos"
ON public.mentoria_processos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view etapas"
ON public.mentoria_etapas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create etapas"
ON public.mentoria_etapas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update etapas"
ON public.mentoria_etapas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete etapas"
ON public.mentoria_etapas FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view tarefas"
ON public.mentoria_tarefas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create tarefas"
ON public.mentoria_tarefas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tarefas"
ON public.mentoria_tarefas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tarefas"
ON public.mentoria_tarefas FOR DELETE TO authenticated USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_mentoria_processos_updated_at
BEFORE UPDATE ON public.mentoria_processos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- DADOS INICIAIS - Processos das imagens
-- =============================================

-- Processo 1: Onboarding MBA 2025
INSERT INTO public.mentoria_processos (id, name, description) VALUES 
('11111111-1111-1111-1111-111111111111', 'Onboarding MBA 2025', 'Processo de entrada de novos mentorados na MBA');

INSERT INTO public.mentoria_etapas (id, processo_id, name, position) VALUES 
('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Processo Padrão', 0);

INSERT INTO public.mentoria_tarefas (etapa_id, title, position) VALUES 
('11111111-1111-1111-1111-111111111112', 'Mensagem de boas-vindas', 0),
('11111111-1111-1111-1111-111111111112', 'Gerar boletos', 1),
('11111111-1111-1111-1111-111111111112', 'Gerar contrato', 2),
('11111111-1111-1111-1111-111111111112', 'Incluir no grupo da mentoria', 3),
('11111111-1111-1111-1111-111111111112', 'Inserir dados coletados na Planilha de Controle', 4),
('11111111-1111-1111-1111-111111111112', 'Enviar acessos', 5),
('11111111-1111-1111-1111-111111111112', 'Acompanhar assinatura do contrato até o fim', 6),
('11111111-1111-1111-1111-111111111112', 'Criar pasta do mentorado', 7),
('11111111-1111-1111-1111-111111111112', 'Inserir nas listas de transmissões', 8),
('11111111-1111-1111-1111-111111111112', 'Notion: ajustar datas de desempenho mensal, cronômetro trimestral e enviar acesso', 9),
('11111111-1111-1111-1111-111111111112', 'Criar grupo de suporte dedicado', 10),
('11111111-1111-1111-1111-111111111112', 'Indicação', 11),
('11111111-1111-1111-1111-111111111112', 'Programar call de boas-vindas e fazer trilha de aceleração', 12);

-- Processo 2: Offboarding MBA2025
INSERT INTO public.mentoria_processos (id, name, description) VALUES 
('22222222-2222-2222-2222-222222222222', 'Offboarding MBA2025', 'Processo de saída de mentorados da MBA');

INSERT INTO public.mentoria_etapas (id, processo_id, name, position) VALUES 
('22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Processo Padrão', 0);

INSERT INTO public.mentoria_tarefas (etapa_id, title, position) VALUES 
('22222222-2222-2222-2222-222222222223', 'Calcular o valor devido', 0),
('22222222-2222-2222-2222-222222222223', 'Remover do grupo de WhatsApp geral da MBA', 1),
('22222222-2222-2222-2222-222222222223', 'Remover acessos dos cursos da Hotmart', 2),
('22222222-2222-2222-2222-222222222223', 'Remover acesso do Notion', 3),
('22222222-2222-2222-2222-222222222223', 'Remover da Lista de Transmissão de WhatsApp', 4),
('22222222-2222-2222-2222-222222222223', 'Remover da planilha de acompanhamento dos alunos', 5),
('22222222-2222-2222-2222-222222222223', 'Grupo de suporte individual: remover participantes', 6),
('22222222-2222-2222-2222-222222222223', 'Subir as informações do distrato no Clicksign e enviar para ser assinado', 7),
('22222222-2222-2222-2222-222222222223', 'Informar aos envolvidos para assinarem o distrato', 8),
('22222222-2222-2222-2222-222222222223', 'Gerar os boletos da rescisão', 9);

-- Processo 3: Entrega Padrão
INSERT INTO public.mentoria_processos (id, name, description) VALUES 
('33333333-3333-3333-3333-333333333333', 'Entrega Padrão', 'Processo de entrega padrão para encontros de mentoria');

-- Etapa: Pré-encontro
INSERT INTO public.mentoria_etapas (id, processo_id, name, position) VALUES 
('33333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'Pré-encontro', 0);

INSERT INTO public.mentoria_tarefas (etapa_id, title, position) VALUES 
('33333333-3333-3333-3333-333333333334', 'Revisar pauta do encontro', 0),
('33333333-3333-3333-3333-333333333334', 'Preparar materiais necessários', 1),
('33333333-3333-3333-3333-333333333334', 'Enviar lembrete para mentorado', 2);

-- Etapa: Encontro
INSERT INTO public.mentoria_etapas (id, processo_id, name, position) VALUES 
('33333333-3333-3333-3333-333333333335', '33333333-3333-3333-3333-333333333333', 'Encontro', 1);

INSERT INTO public.mentoria_tarefas (etapa_id, title, position) VALUES 
('33333333-3333-3333-3333-333333333335', 'Iniciar gravação', 0),
('33333333-3333-3333-3333-333333333335', 'Check-in inicial', 1),
('33333333-3333-3333-3333-333333333335', 'Revisar ações da semana anterior', 2),
('33333333-3333-3333-3333-333333333335', 'Abordar pauta principal', 3),
('33333333-3333-3333-3333-333333333335', 'Definir próximos passos', 4),
('33333333-3333-3333-3333-333333333335', 'Tirar dúvidas finais', 5),
('33333333-3333-3333-3333-333333333335', 'Finalizar gravação', 6);

-- Etapa: Recados finais
INSERT INTO public.mentoria_etapas (id, processo_id, name, position) VALUES 
('33333333-3333-3333-3333-333333333336', '33333333-3333-3333-3333-333333333333', 'Recados finais', 2);

INSERT INTO public.mentoria_tarefas (etapa_id, title, position) VALUES 
('33333333-3333-3333-3333-333333333336', 'Enviar resumo do encontro', 0),
('33333333-3333-3333-3333-333333333336', 'Disponibilizar gravação', 1),
('33333333-3333-3333-3333-333333333336', 'Atualizar acompanhamento', 2);

-- Etapa: Extra encontros
INSERT INTO public.mentoria_etapas (id, processo_id, name, position) VALUES 
('33333333-3333-3333-3333-333333333337', '33333333-3333-3333-3333-333333333333', 'Extra encontros', 3);

INSERT INTO public.mentoria_tarefas (etapa_id, title, position) VALUES 
('33333333-3333-3333-3333-333333333337', 'Agendar encontro extra se necessário', 0),
('33333333-3333-3333-3333-333333333337', 'Revisar progresso geral', 1),
('33333333-3333-3333-3333-333333333337', 'Ajustar cronograma se necessário', 2),
('33333333-3333-3333-3333-333333333337', 'Preparar relatório de acompanhamento', 3),
('33333333-3333-3333-3333-333333333337', 'Verificar engajamento do mentorado', 4),
('33333333-3333-3333-3333-333333333337', 'Avaliar necessidade de suporte adicional', 5),
('33333333-3333-3333-3333-333333333337', 'Documentar insights e aprendizados', 6),
('33333333-3333-3333-3333-333333333337', 'Atualizar metas do trimestre', 7),
('33333333-3333-3333-3333-333333333337', 'Feedback para equipe interna', 8),
('33333333-3333-3333-3333-333333333337', 'Planejar próximo ciclo', 9);