-- Tabela de reuniões
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meeting_time TIME,
  participants TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de blocos de anotações
CREATE TABLE public.meeting_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_meetings_created_by ON public.meetings(created_by);
CREATE INDEX idx_meetings_date ON public.meetings(meeting_date DESC);
CREATE INDEX idx_meeting_blocks_meeting_id ON public.meeting_blocks(meeting_id);
CREATE INDEX idx_meeting_blocks_order ON public.meeting_blocks(meeting_id, order_index);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_blocks ENABLE ROW LEVEL SECURITY;

-- Policies para meetings (todos autenticados podem ver, criador pode editar/deletar)
CREATE POLICY "Authenticated users can view all meetings"
  ON public.meetings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create meetings"
  ON public.meetings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own meetings or admins"
  ON public.meetings FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own meetings or admins"
  ON public.meetings FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Policies para meeting_blocks (seguem a reunião pai)
CREATE POLICY "Authenticated users can view all blocks"
  ON public.meeting_blocks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage blocks of own meetings"
  ON public.meeting_blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE id = meeting_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can update blocks of own meetings"
  ON public.meeting_blocks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE id = meeting_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can delete blocks of own meetings"
  ON public.meeting_blocks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE id = meeting_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Triggers para updated_at
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_meeting_blocks_updated_at
  BEFORE UPDATE ON public.meeting_blocks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();