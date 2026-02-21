import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Ticket {
  id: string;
  numero: number;
  cliente_nome: string;
  cliente_email: string;
  cliente_whatsapp: string;
  origem: string;
  categoria: string;
  descricao: string;
  prioridade: string;
  status: string;
  responsavel_id: string;
  criado_por: string;
  sla_limite: string | null;
  primeira_resposta_em: string | null;
  encerrado_em: string | null;
  tempo_resolucao: number | null;
  solucao_descricao: string | null;
  linked_task_id: string | null;
  created_at: string;
  updated_at: string;
  responsavel?: { full_name: string; display_name: string | null };
  criador?: { full_name: string; display_name: string | null };
}

export interface TicketLog {
  id: string;
  ticket_id: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  acao: string;
  descricao: string | null;
  campo_alterado: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
}

export interface TicketAnexo {
  id: string;
  ticket_id: string;
  arquivo_url: string;
  arquivo_nome: string;
  enviado_por: string | null;
  enviado_por_nome: string | null;
  created_at: string;
}

export interface CreateTicketInput {
  cliente_nome: string;
  cliente_email: string;
  cliente_whatsapp: string;
  cliente_instagram?: string;
  origem: string;
  categoria: string;
  descricao: string;
  prioridade: string;
  responsavel_id: string;
}

const SLA_HOURS: Record<string, number> = {
  critica: 2,
  alta: 8,
  media: 24,
  baixa: 48,
};

function calcSlaLimite(prioridade: string): string {
  const hours = SLA_HOURS[prioridade] ?? 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => [...ticketKeys.all, "list"] as const,
  detail: (id: string) => [...ticketKeys.all, "detail", id] as const,
  logs: (id: string) => [...ticketKeys.all, "logs", id] as const,
  anexos: (id: string) => [...ticketKeys.all, "anexos", id] as const,
  home: () => [...ticketKeys.all, "home"] as const,
};

export function useTickets() {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: ticketKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          responsavel:profiles!tickets_responsavel_id_fkey(full_name, display_name),
          criador:profiles!tickets_criado_por_fkey(full_name, display_name)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as Ticket[];
    },
    enabled: authReady && !!session,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTicket(id: string | null) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: ticketKeys.detail(id ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          responsavel:profiles!tickets_responsavel_id_fkey(full_name, display_name),
          criador:profiles!tickets_criado_por_fkey(full_name, display_name)
        `)
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data as Ticket;
    },
    enabled: authReady && !!session && !!id,
  });
}

export function useTicketLogs(ticketId: string | null) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: ticketKeys.logs(ticketId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_logs")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as TicketLog[];
    },
    enabled: authReady && !!session && !!ticketId,
  });
}

export function useTicketAnexos(ticketId: string | null) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: ticketKeys.anexos(ticketId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_anexos")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as TicketAnexo[];
    },
    enabled: authReady && !!session && !!ticketId,
  });
}

export function useHomeTickets() {
  const { authReady, session, user } = useAuth();

  return useQuery({
    queryKey: ticketKeys.home(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, numero, cliente_nome, prioridade, status, sla_limite, created_at")
        .eq("responsavel_id", user!.id)
        .not("status", "in", '("resolvido","encerrado")')
        .order("sla_limite", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as Pick<Ticket, "id" | "numero" | "cliente_nome" | "prioridade" | "status" | "sla_limite" | "created_at">[];
    },
    enabled: authReady && !!session && !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      const sla_limite = calcSlaLimite(input.prioridade);

      // 1. Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          ...input,
          criado_por: user!.id,
          sla_limite,
        })
        .select("*")
        .single();

      if (ticketError) throw ticketError;

      // 2. Get responsavel name for task
      const { data: respProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", input.responsavel_id)
        .single();

      // 3. Create linked task
      const taskTitle = `Resolver Ticket #${ticket.numero} - ${input.cliente_nome}`;
      const dueDateFromSla = new Date(sla_limite).toISOString().split("T")[0];

      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: taskTitle,
          description: input.descricao,
          priority: input.prioridade === "critica" ? "alta" : input.prioridade === "baixa" ? "baixa" : "media",
          assignee: respProfile?.full_name ?? null,
          assigned_to_id: input.responsavel_id,
          due_date: dueDateFromSla,
          created_by_id: user!.id,
          ticket_id: ticket.id,
        })
        .select("id")
        .single();

      if (!taskError && task) {
        await supabase
          .from("tickets")
          .update({ linked_task_id: task.id })
          .eq("id", ticket.id);
      }

      // 4. Log creation
      await supabase.from("ticket_logs").insert({
        ticket_id: ticket.id,
        usuario_id: user!.id,
        usuario_nome: profile?.display_name || profile?.full_name || "",
        acao: "criado",
        descricao: `Ticket criado por ${profile?.display_name || profile?.full_name}`,
      });

      // 5. Notify responsavel
      if (input.responsavel_id !== user!.id) {
        await supabase.from("notifications").insert({
          title: "Novo ticket atribuído",
          message: `Ticket #${ticket.numero} - ${input.cliente_nome} foi atribuído a você.`,
          type: "info",
          recipient_id: input.responsavel_id,
          sender_id: user!.id,
        });
      }

      return ticket as Ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ ticketId, status, previousStatus }: { ticketId: string; status: string; previousStatus: string }) => {
      const updates: Record<string, unknown> = { status };

      if (status !== "aberto" && !["em_atendimento", "aguardando_cliente", "escalado"].includes(previousStatus)) {
        // First response
        updates.primeira_resposta_em = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", ticketId);

      if (error) throw error;

      await supabase.from("ticket_logs").insert({
        ticket_id: ticketId,
        usuario_id: user!.id,
        usuario_nome: profile?.display_name || profile?.full_name || "",
        acao: "status_alterado",
        campo_alterado: "status",
        valor_anterior: previousStatus,
        valor_novo: status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

export function useTransferTicket() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticketId,
      novoResponsavelId,
      motivo,
      linkedTaskId,
    }: {
      ticketId: string;
      novoResponsavelId: string;
      motivo: string;
      linkedTaskId: string | null;
    }) => {
      const { data: novoResp } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", novoResponsavelId)
        .single();

      await supabase
        .from("tickets")
        .update({ responsavel_id: novoResponsavelId })
        .eq("id", ticketId);

      // Update linked task
      if (linkedTaskId) {
        await supabase
          .from("tasks")
          .update({
            assigned_to_id: novoResponsavelId,
            assignee: novoResp?.full_name ?? null,
          })
          .eq("id", linkedTaskId);
      }

      await supabase.from("ticket_logs").insert({
        ticket_id: ticketId,
        usuario_id: user!.id,
        usuario_nome: profile?.display_name || profile?.full_name || "",
        acao: "responsavel_transferido",
        descricao: `Motivo: ${motivo}. Transferido para ${novoResp?.full_name || ""}`,
        campo_alterado: "responsavel_id",
        valor_novo: novoResp?.full_name || novoResponsavelId,
      });

      // Notify new responsavel
      await supabase.from("notifications").insert({
        title: "Ticket transferido para você",
        message: `Um ticket foi transferido para você. Motivo: ${motivo}`,
        type: "warning",
        recipient_id: novoResponsavelId,
        sender_id: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCloseTicket() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticketId,
      solucaoDescricao,
      linkedTaskId,
      createdAt,
    }: {
      ticketId: string;
      solucaoDescricao: string;
      linkedTaskId: string | null;
      createdAt: string;
    }) => {
      const now = new Date();
      const createdDate = new Date(createdAt);
      const tempoResolucao = Math.round((now.getTime() - createdDate.getTime()) / 60000);

      await supabase
        .from("tickets")
        .update({
          status: "encerrado",
          solucao_descricao: solucaoDescricao,
          encerrado_em: now.toISOString(),
          tempo_resolucao: tempoResolucao,
        })
        .eq("id", ticketId);

      // Complete linked task
      if (linkedTaskId) {
        await supabase
          .from("tasks")
          .update({ completed: true, completed_at: now.toISOString() })
          .eq("id", linkedTaskId);
      }

      await supabase.from("ticket_logs").insert({
        ticket_id: ticketId,
        usuario_id: user!.id,
        usuario_nome: profile?.display_name || profile?.full_name || "",
        acao: "encerrado",
        descricao: `Ticket encerrado. Tempo de resolução: ${tempoResolucao} minutos.`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useAddTicketComment() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ ticketId, descricao }: { ticketId: string; descricao: string }) => {
      await supabase.from("ticket_logs").insert({
        ticket_id: ticketId,
        usuario_id: user!.id,
        usuario_nome: profile?.display_name || profile?.full_name || "",
        acao: "comentario",
        descricao,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.logs(vars.ticketId) });
    },
  });
}

export function useUploadTicketAnexo() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ ticketId, file }: { ticketId: string; file: File }) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${ticketId}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("ticket-anexos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("ticket-anexos")
        .getPublicUrl(filePath);

      const { error } = await supabase.from("ticket_anexos").insert({
        ticket_id: ticketId,
        arquivo_url: urlData.publicUrl,
        arquivo_nome: file.name,
        enviado_por: user!.id,
        enviado_por_nome: profile?.display_name || profile?.full_name || "",
      });

      if (error) throw error;

      await supabase.from("ticket_logs").insert({
        ticket_id: ticketId,
        usuario_id: user!.id,
        usuario_nome: profile?.display_name || profile?.full_name || "",
        acao: "anexo_adicionado",
        descricao: `Arquivo anexado: ${file.name}`,
      });

      return urlData.publicUrl;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.anexos(vars.ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.logs(vars.ticketId) });
    },
  });
}

export function useQuickTransferTicket() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticketId,
      novoResponsavelId,
      novoResponsavelNome,
      linkedTaskId,
    }: {
      ticketId: string;
      novoResponsavelId: string;
      novoResponsavelNome: string;
      linkedTaskId: string | null;
    }) => {
      await supabase
        .from("tickets")
        .update({ responsavel_id: novoResponsavelId })
        .eq("id", ticketId);

      if (linkedTaskId) {
        await supabase
          .from("tasks")
          .update({
            assigned_to_id: novoResponsavelId,
            assignee: novoResponsavelNome,
          })
          .eq("id", linkedTaskId);
      }

      await supabase.from("ticket_logs").insert({
        ticket_id: ticketId,
        usuario_id: user!.id,
        usuario_nome: profile?.display_name || profile?.full_name || "",
        acao: "responsavel_transferido",
        descricao: `Transferido para ${novoResponsavelNome} (reatribuição rápida)`,
        campo_alterado: "responsavel_id",
        valor_novo: novoResponsavelNome,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useBulkUpdateTickets() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticketIds,
      updates,
      novoResponsavelNome,
    }: {
      ticketIds: string[];
      updates: Record<string, unknown>;
      novoResponsavelNome?: string;
    }) => {
      for (const ticketId of ticketIds) {
        const { error } = await supabase
          .from("tickets")
          .update(updates)
          .eq("id", ticketId);
        if (error) throw error;

        // If changing responsável, also update linked task
        if (updates.responsavel_id && novoResponsavelNome) {
          const { data: ticket } = await supabase
            .from("tickets")
            .select("linked_task_id")
            .eq("id", ticketId)
            .single();

          if (ticket?.linked_task_id) {
            await supabase
              .from("tasks")
              .update({
                assigned_to_id: updates.responsavel_id as string,
                assignee: novoResponsavelNome,
              })
              .eq("id", ticket.linked_task_id);
          }
        }

        const changes: string[] = [];
        if (updates.status) changes.push(`Status → ${updates.status}`);
        if (updates.responsavel_id) changes.push(`Responsável → ${novoResponsavelNome}`);
        if (updates.prioridade) changes.push(`Prioridade → ${updates.prioridade}`);

        await supabase.from("ticket_logs").insert({
          ticket_id: ticketId,
          usuario_id: user!.id,
          usuario_nome: profile?.display_name || profile?.full_name || "",
          acao: "edicao_em_massa",
          descricao: `Edição em massa: ${changes.join(", ")}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      // Get linked task id before deleting
      const { data: ticket } = await supabase
        .from("tickets")
        .select("linked_task_id")
        .eq("id", ticketId)
        .single();

      // Delete linked task FIRST (it references the ticket via ticket_id FK)
      if (ticket?.linked_task_id) {
        await supabase.from("subtasks").delete().eq("task_id", ticket.linked_task_id);
        await supabase.from("task_comments").delete().eq("task_id", ticket.linked_task_id);
        await supabase.from("task_history").delete().eq("task_id", ticket.linked_task_id);
        await supabase.from("tasks").delete().eq("id", ticket.linked_task_id);
      }

      // Delete ticket child records
      await supabase.from("ticket_anexos").delete().eq("ticket_id", ticketId);
      await supabase.from("ticket_logs").delete().eq("ticket_id", ticketId);

      // Finally delete the ticket
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
