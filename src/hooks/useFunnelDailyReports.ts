import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FunnelDailyReport {
  id: string;
  funnel_id: string;
  report_date: string;
  contacts: number;
  followups: number;
  reschedules: number;
  meetings_scheduled: number;
  meetings_held: number;
  no_shows: number;
  sales: number;
  summary: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateDailyReportInput {
  funnel_id: string;
  funnel_name: string;
  report_date: string;
  contacts: number;
  followups: number;
  reschedules: number;
  meetings_scheduled: number;
  meetings_held: number;
  no_shows: number;
  sales: number;
  summary: string;
}

export function useFunnelDailyReports(funnelId: string) {
  return useQuery({
    queryKey: ["funnel-daily-reports", funnelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_daily_reports")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("report_date", { ascending: false });

      if (error) throw error;
      return data as FunnelDailyReport[];
    },
    enabled: !!funnelId,
  });
}

export function useTodayReport(funnelId: string, reportDate?: string) {
  const dateToUse = reportDate || new Date().toISOString().split("T")[0];
  
  return useQuery({
    queryKey: ["funnel-daily-report-today", funnelId, dateToUse],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_daily_reports")
        .select("*")
        .eq("funnel_id", funnelId)
        .eq("report_date", dateToUse)
        .maybeSingle();

      if (error) throw error;
      return data as FunnelDailyReport | null;
    },
    enabled: !!funnelId,
  });
}

export function useCreateDailyReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateDailyReportInput) => {
      const { funnel_name, ...reportData } = input;
      
      // Save to database
      const { data, error } = await supabase
        .from("funnel_daily_reports")
        .upsert({
          ...reportData,
          created_by: user?.id,
        }, {
          onConflict: "funnel_id,report_date",
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger webhook
      try {
        await supabase.functions.invoke("funnel-daily-report-webhook", {
          body: {
            funnel_id: input.funnel_id,
            funnel_name: funnel_name,
            report_date: input.report_date,
            contacts: input.contacts,
            followups: input.followups,
            reschedules: input.reschedules,
            meetings_scheduled: input.meetings_scheduled,
            meetings_held: input.meetings_held,
            no_shows: input.no_shows,
            sales: input.sales,
            summary: input.summary,
            reported_by: user?.user_metadata?.full_name || user?.email || "Usuário",
            reported_at: new Date().toISOString(),
          },
        });
      } catch (webhookError) {
        console.error("Webhook error:", webhookError);
        // Don't fail the mutation if webhook fails
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["funnel-daily-reports", variables.funnel_id] });
      queryClient.invalidateQueries({ queryKey: ["funnel-daily-report-today", variables.funnel_id] });
      queryClient.invalidateQueries({ queryKey: ["pending-daily-reports"] });
      toast.success("Relatório salvo com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating daily report:", error);
      toast.error("Erro ao salvar relatório");
    },
  });
}

export function usePendingDailyReports() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["pending-daily-reports", user?.id, today],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all active High Ticket funnels where user is responsible
      const { data: funnels, error: funnelsError } = await supabase
        .from("funnels")
        .select("id, name")
        .eq("responsible_user_id", user.id)
        .eq("category", "High ticket")
        .eq("is_active", true);

      if (funnelsError) throw funnelsError;
      if (!funnels || funnels.length === 0) return [];

      // Get today's reports for these funnels
      const funnelIds = funnels.map((f) => f.id);
      const { data: reports, error: reportsError } = await supabase
        .from("funnel_daily_reports")
        .select("funnel_id")
        .in("funnel_id", funnelIds)
        .eq("report_date", today);

      if (reportsError) throw reportsError;

      // Find funnels without today's report
      const reportedFunnelIds = new Set(reports?.map((r) => r.funnel_id) || []);
      const pendingFunnels = funnels.filter((f) => !reportedFunnelIds.has(f.id));

      return pendingFunnels;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateFunnelResponsible() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ funnelId, userId }: { funnelId: string; userId: string | null }) => {
      const { error } = await supabase
        .from("funnels")
        .update({ responsible_user_id: userId })
        .eq("id", funnelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-daily-reports"] });
      toast.success("Responsável atualizado!");
    },
    onError: (error) => {
      console.error("Error updating responsible:", error);
      toast.error("Erro ao atualizar responsável");
    },
  });
}
