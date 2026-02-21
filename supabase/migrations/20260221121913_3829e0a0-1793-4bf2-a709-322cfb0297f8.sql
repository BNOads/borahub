
-- Sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS public.ticket_numero_seq START 1;

-- Tabela tickets
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL DEFAULT nextval('public.ticket_numero_seq'),
  cliente_nome text NOT NULL,
  cliente_email text NOT NULL,
  cliente_whatsapp text NOT NULL,
  origem text NOT NULL,
  categoria text NOT NULL,
  descricao text NOT NULL,
  prioridade text NOT NULL,
  status text NOT NULL DEFAULT 'aberto',
  responsavel_id uuid NOT NULL REFERENCES public.profiles(id),
  criado_por uuid NOT NULL REFERENCES public.profiles(id),
  sla_limite timestamptz,
  primeira_resposta_em timestamptz,
  encerrado_em timestamptz,
  tempo_resolucao integer,
  solucao_descricao text,
  linked_task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela ticket_logs
CREATE TABLE public.ticket_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  usuario_id uuid,
  usuario_nome text,
  acao text NOT NULL,
  descricao text,
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela ticket_anexos
CREATE TABLE public.ticket_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  arquivo_url text NOT NULL,
  arquivo_nome text NOT NULL,
  enviado_por uuid,
  enviado_por_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Adicionar ticket_id na tabela tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES public.tickets(id);

-- Trigger updated_at para tickets
CREATE TRIGGER handle_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tickets"
  ON public.tickets FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete tickets"
  ON public.tickets FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- RLS ticket_logs (permanent, no update/delete)
ALTER TABLE public.ticket_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ticket logs"
  ON public.ticket_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create ticket logs"
  ON public.ticket_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS ticket_anexos
ALTER TABLE public.ticket_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ticket anexos"
  ON public.ticket_anexos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create ticket anexos"
  ON public.ticket_anexos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete ticket anexos"
  ON public.ticket_anexos FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Storage bucket para anexos
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-anexos', 'ticket-anexos', true);

CREATE POLICY "Authenticated users can upload ticket anexos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ticket-anexos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view ticket anexos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ticket-anexos');

CREATE POLICY "Authenticated users can delete own ticket anexos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ticket-anexos' AND auth.uid() IS NOT NULL);

-- Index para performance
CREATE INDEX idx_tickets_responsavel ON public.tickets(responsavel_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_prioridade ON public.tickets(prioridade);
CREATE INDEX idx_ticket_logs_ticket ON public.ticket_logs(ticket_id);
CREATE INDEX idx_ticket_anexos_ticket ON public.ticket_anexos(ticket_id);
CREATE INDEX idx_tasks_ticket ON public.tasks(ticket_id);
