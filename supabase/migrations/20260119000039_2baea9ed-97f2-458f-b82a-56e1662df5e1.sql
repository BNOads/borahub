-- Tabela principal de PDIs
CREATE TABLE public.pdis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  colaborador_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_limite DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'finalizado', 'atrasado')),
  criado_por UUID REFERENCES public.profiles(id),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de aulas do PDI
CREATE TABLE public.pdi_aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdi_id UUID NOT NULL REFERENCES public.pdis(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'externa' CHECK (origem IN ('interna', 'externa')),
  curso_origem TEXT,
  lesson_id UUID REFERENCES public.lessons(id),
  link_externo TEXT,
  duracao_minutos INTEGER,
  status TEXT NOT NULL DEFAULT 'nao_iniciada' CHECK (status IN ('nao_iniciada', 'concluida')),
  ordem INTEGER NOT NULL DEFAULT 0,
  concluida_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de acessos necessários do PDI
CREATE TABLE public.pdi_acessos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdi_id UUID NOT NULL REFERENCES public.pdis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'outros',
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_acessos ENABLE ROW LEVEL SECURITY;

-- Policies para pdis
CREATE POLICY "Usuarios podem ver seus proprios PDIs" ON public.pdis
  FOR SELECT USING (colaborador_id = auth.uid() OR criado_por = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins e managers podem criar PDIs" ON public.pdis
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins e managers podem atualizar PDIs" ON public.pdis
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins e managers podem deletar PDIs" ON public.pdis
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Policies para pdi_aulas
CREATE POLICY "Usuarios podem ver aulas dos seus PDIs" ON public.pdi_aulas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pdis WHERE pdis.id = pdi_aulas.pdi_id 
      AND (pdis.colaborador_id = auth.uid() OR pdis.criado_por = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

CREATE POLICY "Admins e managers podem gerenciar aulas" ON public.pdi_aulas
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Colaboradores podem marcar aulas como concluidas" ON public.pdi_aulas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.pdis WHERE pdis.id = pdi_aulas.pdi_id AND pdis.colaborador_id = auth.uid()
    )
  );

-- Policies para pdi_acessos
CREATE POLICY "Usuarios podem ver acessos dos seus PDIs" ON public.pdi_acessos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pdis WHERE pdis.id = pdi_acessos.pdi_id 
      AND (pdis.colaborador_id = auth.uid() OR pdis.criado_por = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

CREATE POLICY "Admins e managers podem gerenciar acessos" ON public.pdi_acessos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_pdis_updated_at
  BEFORE UPDATE ON public.pdis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_pdis_colaborador ON public.pdis(colaborador_id);
CREATE INDEX idx_pdis_status ON public.pdis(status);
CREATE INDEX idx_pdi_aulas_pdi ON public.pdi_aulas(pdi_id);
CREATE INDEX idx_pdi_acessos_pdi ON public.pdi_acessos(pdi_id);