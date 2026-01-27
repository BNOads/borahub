import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

export interface Report {
  id: string;
  title: string;
  report_type: string;
  period_start: string;
  period_end: string;
  scope: string[];
  filters: Record<string, unknown>;
  content_html: string | null;
  content_markdown: string | null;
  ai_suggestions: AISuggestion[];
  generated_by: string | null;
  generated_at: string;
  status: "generating" | "completed" | "error";
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface AISuggestion {
  title: string;
  description: string;
  suggested_scope: string[];
  suggested_period?: string;
}

export interface GenerateReportParams {
  title: string;
  report_type: string;
  period_start: string;
  period_end: string;
  scope: string[];
  filters?: Record<string, unknown>;
}

export interface ReportFilters {
  report_type?: string;
  period_start?: string;
  period_end?: string;
}

export function useReports(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", filters],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select(`
          *,
          profiles:generated_by (
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });

      if (filters?.report_type) {
        query = query.eq("report_type", filters.report_type);
      }

      if (filters?.period_start) {
        query = query.gte("period_start", filters.period_start);
      }

      if (filters?.period_end) {
        query = query.lte("period_end", filters.period_end);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(transformReport);
    },
  });
}

function transformReport(data: unknown): Report {
  const raw = data as Record<string, unknown>;
  return {
    ...raw,
    scope: Array.isArray(raw.scope) ? raw.scope : [],
    filters: (raw.filters as Record<string, unknown>) || {},
    ai_suggestions: Array.isArray(raw.ai_suggestions) ? raw.ai_suggestions as AISuggestion[] : [],
  } as Report;
}

export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("reports")
        .select(`
          *,
          profiles:generated_by (
            full_name,
            avatar_url
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return transformReport(data);
    },
    enabled: !!id,
  });
}

export function useGenerateReport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateReportParams) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar relatório");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({
        title: "Relatório gerado!",
        description: "O relatório foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar relatório",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export interface UpdateReportParams {
  id: string;
  title?: string;
  content_markdown?: string;
}

export function useUpdateReport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateReportParams) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from("reports")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["report"] });
      toast({
        title: "Relatório atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteReport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({
        title: "Relatório excluído",
        description: "O relatório foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export const REPORT_TYPES = [
  { value: "weekly", label: "Relatório Semanal" },
  { value: "event", label: "Relatório de Evento" },
  { value: "commercial", label: "Relatório Comercial" },
  { value: "operational", label: "Relatório Operacional" },
  { value: "custom", label: "Relatório Personalizado" },
];

export const REPORT_SCOPES = [
  { value: "events", label: "Eventos", description: "Eventos presenciais e online" },
  { value: "funnels", label: "Funis de Marketing", description: "Funis, leads e captação" },
  { value: "sales", label: "Vendas e Faturamento", description: "Vendas, parcelas e receita" },
  { value: "tasks", label: "Tarefas por Pessoa", description: "Produtividade e entregas" },
  { value: "sponsors", label: "Patrocinadores", description: "Parcerias e patrocínios" },
  { value: "content", label: "Conteúdo", description: "Posts e calendário editorial" },
];
