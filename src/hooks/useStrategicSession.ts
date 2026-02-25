import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { computeLeadScore } from "@/lib/leadScoring";

// Types
export interface StageConfig {
  key: string;
  label: string;
  color: string;
}

export const DEFAULT_STAGES: StageConfig[] = [
  { key: 'lead', label: 'Lead', color: 'bg-blue-500' },
  { key: 'qualificado', label: 'Qualificado', color: 'bg-purple-500' },
  { key: 'agendado', label: 'Agendado', color: 'bg-orange-500' },
  { key: 'realizado', label: 'Realizado', color: 'bg-emerald-500' },
  { key: 'venda', label: 'Venda', color: 'bg-green-600' },
];

export function getSessionStages(session: StrategicSession | undefined): StageConfig[] {
  if (session?.custom_stages && Array.isArray(session.custom_stages) && session.custom_stages.length > 0) {
    return session.custom_stages as StageConfig[];
  }
  return DEFAULT_STAGES;
}

export interface StrategicSession {
  id: string;
  name: string;
  description: string | null;
  status: string;
  google_sheet_url: string | null;
  google_calendar_id: string | null;
  public_slug: string | null;
  custom_stages: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategicLead {
  id: string;
  session_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  is_qualified: boolean;
  qualification_score: number | null;
  qualification_notes: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  meeting_date: string | null;
  meeting_notes: string | null;
  sale_value: number | null;
  assigned_to: string | null;
  extra_data: Record<string, unknown>;
  source_row_id: string | null;
  order_index: number;
  observation: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategicLeadHistory {
  id: string;
  lead_id: string;
  previous_stage: string | null;
  new_stage: string;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
}

export interface StrategicDailyReport {
  id: string;
  session_id: string;
  report_date: string;
  report_type: string;
  author_id: string | null;
  author_name: string;
  contacts: number;
  followups: number;
  meetings_scheduled: number;
  meetings_held: number;
  no_shows: number;
  sales: number;
  summary: string | null;
  created_at: string;
}

export interface StrategicLink {
  id: string;
  session_id: string;
  name: string;
  url: string;
  category: string | null;
  order_index: number;
  created_at: string;
}

export interface QualificationCriterion {
  id: string;
  session_id: string;
  field_name: string;
  operator: string;
  value: string;
  weight: number;
  created_at: string;
}

const STAGES = ['lead', 'qualificado', 'agendado', 'realizado', 'venda'] as const;
export { STAGES };

// Sessions
export function useStrategicSessions() {
  return useQuery({
    queryKey: ["strategic-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as StrategicSession[];
    },
  });
}

export function useStrategicSession(id: string | undefined) {
  return useQuery({
    queryKey: ["strategic-session", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_sessions")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as StrategicSession;
    },
    enabled: !!id,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (values: { name: string; description?: string }) => {
      const slug = Math.random().toString(36).substring(2, 8);
      const { data, error } = await supabase.from("strategic_sessions").insert({
        name: values.name,
        description: values.description || null,
        public_slug: slug,
        created_by: profile?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic-sessions"] });
      toast.success("Sessão criada com sucesso");
    },
    onError: () => toast.error("Erro ao criar sessão"),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<StrategicSession> & { id: string }) => {
      const { error } = await supabase.from("strategic_sessions").update(values as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["strategic-sessions"] });
      qc.invalidateQueries({ queryKey: ["strategic-session", vars.id] });
      toast.success("Sessão atualizada");
    },
    onError: () => toast.error("Erro ao atualizar sessão"),
  });
}

// Leads
export function useStrategicLeads(sessionId: string | undefined, filters?: { stage?: string; utm_source?: string; is_qualified?: boolean }) {
  return useQuery({
    queryKey: ["strategic-leads", sessionId, filters],
    queryFn: async () => {
      const allData: StrategicLead[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("strategic_leads")
          .select("*")
          .eq("session_id", sessionId!)
          .order("order_index")
          .range(offset, offset + batchSize - 1);
        if (filters?.stage) query = query.eq("stage", filters.stage);
        if (filters?.utm_source) query = query.eq("utm_source", filters.utm_source);
        if (filters?.is_qualified !== undefined) query = query.eq("is_qualified", filters.is_qualified);
        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
          allData.push(...(data as StrategicLead[]));
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      return allData;
    },
    enabled: !!sessionId,
  });
}

export function useUpdateLeadStage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ leadId, newStage, previousStage }: { leadId: string; newStage: string; previousStage: string }) => {
      const { error: updateError } = await supabase
        .from("strategic_leads")
        .update({ stage: newStage })
        .eq("id", leadId);
      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from("strategic_lead_history")
        .insert({
          lead_id: leadId,
          previous_stage: previousStage,
          new_stage: newStage,
          changed_by: profile?.id || null,
          changed_by_name: profile?.full_name || profile?.display_name || null,
        });
      if (historyError) throw historyError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic-leads"] });
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<StrategicLead> & { session_id: string; name: string }) => {
      const { extra_data, ...rest } = values;
      const insertData = { ...rest, extra_data: extra_data ? JSON.parse(JSON.stringify(extra_data)) : undefined };
      const { data, error } = await supabase.from("strategic_leads").insert(insertData as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic-leads"] });
      toast.success("Lead adicionado");
    },
    onError: () => toast.error("Erro ao adicionar lead"),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<StrategicLead> & { id: string }) => {
      const { extra_data, ...rest } = values;
      const updateData = { ...rest, extra_data: extra_data ? JSON.parse(JSON.stringify(extra_data)) : undefined };
      const { error } = await supabase.from("strategic_leads").update(updateData as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic-leads"] });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("strategic_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic-leads"] });
      toast.success("Lead excluído");
    },
    onError: () => toast.error("Erro ao excluir lead"),
  });
}

export function useDeduplicateLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.rpc("remove_duplicate_strategic_leads", { p_session_id: sessionId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["strategic-leads"] });
      if (count > 0) {
        toast.success(`${count} leads duplicados removidos`);
      } else {
        toast.info("Nenhum lead duplicado encontrado");
      }
    },
    onError: () => toast.error("Erro ao remover duplicados"),
  });
}

// Lead History
export function useLeadHistory(leadId: string | undefined) {
  return useQuery({
    queryKey: ["strategic-lead-history", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_lead_history")
        .select("*")
        .eq("lead_id", leadId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data as StrategicLeadHistory[];
    },
    enabled: !!leadId,
  });
}

// Daily Reports
export function useStrategicDailyReports(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["strategic-daily-reports", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_daily_reports")
        .select("*")
        .eq("session_id", sessionId!)
        .order("report_date", { ascending: false });
      if (error) throw error;
      return data as StrategicDailyReport[];
    },
    enabled: !!sessionId,
  });
}

export function useCreateDailyReport() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (values: Omit<StrategicDailyReport, "id" | "created_at" | "author_id" | "author_name">) => {
      const { error } = await supabase.from("strategic_daily_reports").insert({
        ...values,
        author_id: profile?.id || null,
        author_name: profile?.full_name || profile?.display_name || "Anônimo",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic-daily-reports"] });
      toast.success("Relatório salvo");
    },
    onError: () => toast.error("Erro ao salvar relatório"),
  });
}

// Links
export function useStrategicLinks(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["strategic-links", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_links")
        .select("*")
        .eq("session_id", sessionId!)
        .order("order_index");
      if (error) throw error;
      return data as StrategicLink[];
    },
    enabled: !!sessionId,
  });
}

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { session_id: string; name: string; url: string; category?: string }) => {
      const { error } = await supabase.from("strategic_links").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic-links"] });
      toast.success("Link adicionado");
    },
    onError: () => toast.error("Erro ao adicionar link"),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("strategic_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic-links"] });
    },
  });
}

// Qualification Criteria
export function useQualificationCriteria(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["strategic-criteria", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_qualification_criteria")
        .select("*")
        .eq("session_id", sessionId!)
        .order("created_at");
      if (error) throw error;
      return data as QualificationCriterion[];
    },
    enabled: !!sessionId,
  });
}

export function useCreateCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { session_id: string; field_name: string; operator: string; value: string; weight?: number }) => {
      const { error } = await supabase.from("strategic_qualification_criteria").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic-criteria"] });
      toast.success("Critério adicionado");
    },
    onError: () => toast.error("Erro ao adicionar critério"),
  });
}

export function useDeleteCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("strategic_qualification_criteria").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic-criteria"] });
    },
  });
}

// UTM Analytics - full breakdown by all dimensions
export function useUTMAnalytics(sessionId: string | undefined) {
  // Import computeLeadScore inline to determine qualification status
  return useQuery({
    queryKey: ["strategic-utm-analytics", sessionId],
    queryFn: async () => {
      const allData: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("strategic_leads")
          .select("utm_source, utm_medium, utm_campaign, utm_content, stage, is_qualified, extra_data, created_at")
          .eq("session_id", sessionId!)
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allData.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      const UTM_KEYS: Record<string, string[]> = {
        utm_source: ["utm_source", "utm source", "fonte", "source"],
        utm_medium: ["utm_medium", "utm medium", "medium", "mídia", "midia"],
        utm_campaign: ["utm_campaign", "utm campaign", "campanha", "campaign"],
        utm_content: ["utm_content", "utm content", "content", "conteúdo", "conteudo"],
        utm_term: ["utm_term", "utm term", "term", "termo"],
      };

      function extractUtm(lead: any, utmKey: string): string {
        const topLevel = lead[utmKey];
        if (topLevel && String(topLevel).trim()) return String(topLevel).trim();
        const extra = lead.extra_data;
        if (!extra || typeof extra !== 'object') return "";
        const candidates = UTM_KEYS[utmKey] || [utmKey];
        for (const key of candidates) {
          for (const [k, v] of Object.entries(extra as Record<string, string>)) {
            if (k.toLowerCase() === key.toLowerCase() && v && String(v).trim()) return String(v).trim();
          }
        }
        return "";
      }

      function aggregate(dimension: string) {
        const map: Record<string, { total: number; qualified: number; vendas: number }> = {};
        allData.forEach((lead: any) => {
          let val = extractUtm(lead, dimension);
          if (!val) val = "Sem dados";
          if (!map[val]) map[val] = { total: 0, qualified: 0, vendas: 0 };
          map[val].total++;
          if (computeLeadScore(lead).isQualified) map[val].qualified++;
          if (lead.stage === "venda") map[val].vendas++;
        });
        return Object.entries(map)
          .map(([name, stats]) => ({ name, ...stats, convPercent: stats.total > 0 ? Math.round((stats.vendas / stats.total) * 100) : 0 }))
          .sort((a, b) => b.total - a.total);
      }

      // Stage funnel
      const stageOrder = ['lead', 'qualificado', 'agendado', 'realizado', 'venda'];
      const stageLabels: Record<string, string> = { lead: 'Lead', qualificado: 'Qualificado', agendado: 'Agendado', realizado: 'Realizado', venda: 'Venda' };
      const funnel = stageOrder.map(s => ({
        name: stageLabels[s],
        value: allData.filter(l => l.stage === s).length,
      }));

      // Daily leads over time
      const dailyMap: Record<string, number> = {};
      allData.forEach(l => {
        const d = l.created_at?.split("T")[0];
        if (d) dailyMap[d] = (dailyMap[d] || 0) + 1;
      });
      const daily = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({
        date: date.split("-").reverse().join("/"),
        leads: count,
      }));

      return {
        bySource: aggregate("utm_source"),
        byMedium: aggregate("utm_medium"),
        byCampaign: aggregate("utm_campaign"),
        byContent: aggregate("utm_content"),
        byTerm: aggregate("utm_term"),
        funnel,
        daily,
        total: allData.length,
        qualified: allData.filter((l: any) => computeLeadScore(l).isQualified).length,
        vendas: allData.filter((l: any) => l.stage === "venda").length,
      };
    },
    enabled: !!sessionId,
  });
}

// Batch update lead scoring
export function useBatchUpdateScoring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; is_qualified: boolean; qualification_score: number }[]) => {
      // Process in batches of 50
      for (let i = 0; i < updates.length; i += 50) {
        const batch = updates.slice(i, i + 50);
        const promises = batch.map(u =>
          supabase.from("strategic_leads").update({
            is_qualified: u.is_qualified,
            qualification_score: u.qualification_score,
          }).eq("id", u.id)
        );
        const results = await Promise.all(promises);
        const err = results.find(r => r.error);
        if (err?.error) throw err.error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic-leads"] });
      qc.invalidateQueries({ queryKey: ["strategic-utm-analytics"] });
      toast.success("Lead scoring recalculado para todos os leads");
    },
    onError: () => toast.error("Erro ao recalcular scoring"),
  });
}

// Sales lookup for student badge
export function useSalesLookup() {
  return useQuery({
    queryKey: ["sales-student-lookup"],
    queryFn: async () => {
      const allData: { client_email: string | null; client_phone: string | null; product_name: string | null; platform: string | null }[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("sales")
          .select("client_email, client_phone, product_name, platform")
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allData.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      return allData;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  // Remove leading 55 (Brazil country code)
  if (digits.length >= 12 && digits.startsWith("55")) return digits.slice(2);
  return digits;
}

function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

export interface StudentInfo {
  isStudent: boolean;
  products: { name: string; platform: string }[];
}

export function getStudentInfo(
  lead: StrategicLead,
  salesData: { client_email: string | null; client_phone: string | null; product_name: string | null; platform: string | null }[] | undefined
): StudentInfo {
  if (!salesData || salesData.length === 0) return { isStudent: false, products: [] };

  const extra = (lead.extra_data || {}) as Record<string, string>;
  const leadEmails = new Set<string>();
  const leadPhones = new Set<string>();

  // Collect all possible emails
  [lead.email, extra["e-mail"], extra["email"], extra["Email"], extra["E-mail"]].forEach(e => {
    const n = normalizeEmail(e);
    if (n) leadEmails.add(n);
  });

  // Collect all possible phones
  [lead.phone, extra["whatsapp"], extra["Whatsapp"], extra["telefone"], extra["Telefone"], extra["phone"], extra["Phone"]].forEach(p => {
    const n = normalizePhone(p);
    if (n) leadPhones.add(n);
  });

  if (leadEmails.size === 0 && leadPhones.size === 0) return { isStudent: false, products: [] };

  const matchedProducts = new Map<string, string>();

  for (const sale of salesData) {
    const saleEmail = normalizeEmail(sale.client_email);
    const salePhone = normalizePhone(sale.client_phone);

    const emailMatch = saleEmail && leadEmails.has(saleEmail);
    const phoneMatch = salePhone && leadPhones.has(salePhone);

    if (emailMatch || phoneMatch) {
      const prodName = sale.product_name || "Produto desconhecido";
      if (!matchedProducts.has(prodName)) {
        matchedProducts.set(prodName, sale.platform || "desconhecido");
      }
    }
  }

  if (matchedProducts.size === 0) return { isStudent: false, products: [] };

  return {
    isStudent: true,
    products: Array.from(matchedProducts.entries()).map(([name, platform]) => ({ name, platform })),
  };
}

// Google Sheets Sync
export function useSyncGoogleSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.functions.invoke("sync-strategic-leads", {
        body: { session_id: sessionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic-leads"] });
      toast.success("Sincronização concluída");
    },
    onError: () => toast.error("Erro ao sincronizar planilha"),
  });
}

// Google Calendar Events
export function useGoogleCalendarEvents(calendarId: string | undefined | null, date?: string) {
  return useQuery({
    queryKey: ["strategic-calendar-events", calendarId, date],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-google-calendar-events", {
        body: { calendar_id: calendarId, date: date || new Date().toISOString().split("T")[0] },
      });
      if (error) throw error;
      return data?.events || [];
    },
    enabled: !!calendarId,
    refetchInterval: 60000, // refresh every minute
  });
}

// Public session by slug
export function usePublicSession(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-strategic-session", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_sessions")
        .select("*")
        .eq("public_slug", slug!)
        .single();
      if (error) throw error;
      return data as StrategicSession;
    },
    enabled: !!slug,
  });
}

export function usePublicLeads(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["public-strategic-leads", sessionId],
    queryFn: async () => {
      const allData: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("strategic_leads")
          .select("id, stage, is_qualified, qualification_score, utm_source, utm_medium, utm_campaign, utm_content, extra_data, created_at, name, email, phone")
          .eq("session_id", sessionId!)
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allData.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      return allData as StrategicLead[];
    },
    enabled: !!sessionId,
  });
}

export function usePublicDailyReports(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["public-strategic-reports", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_daily_reports")
        .select("*")
        .eq("session_id", sessionId!)
        .order("report_date", { ascending: false })
        .limit(2);
      if (error) throw error;
      return data as StrategicDailyReport[];
    },
    enabled: !!sessionId,
  });
}

export function usePublicLinks(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["public-strategic-links", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_links")
        .select("*")
        .eq("session_id", sessionId!)
        .order("order_index");
      if (error) throw error;
      return data as StrategicLink[];
    },
    enabled: !!sessionId,
  });
}
