import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

// Types
export type FunnelDiaryEntry = Database["public"]["Tables"]["funnel_diary"]["Row"];
export type FunnelDiaryInsert = Database["public"]["Tables"]["funnel_diary"]["Insert"];

export type FunnelChecklistItem = Database["public"]["Tables"]["funnel_checklist"]["Row"];
export type FunnelChecklistInsert = Database["public"]["Tables"]["funnel_checklist"]["Insert"];

// Query keys
export const funnelDiaryKeys = {
  all: ["funnel_diary"] as const,
  list: (funnelId: string) => [...funnelDiaryKeys.all, "list", funnelId] as const,
};

export const funnelChecklistKeys = {
  all: ["funnel_checklist"] as const,
  list: (funnelId: string) => [...funnelChecklistKeys.all, "list", funnelId] as const,
};

// ========== DIARY HOOKS ==========
export function useFunnelDiary(funnelId: string) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: funnelDiaryKeys.list(funnelId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_diary")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching funnel diary:", error);
        return [];
      }
      return data as FunnelDiaryEntry[];
    },
    enabled: authReady && !!session && !!funnelId,
  });
}

export function useCreateDiaryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: FunnelDiaryInsert) => {
      const { data, error } = await supabase
        .from("funnel_diary")
        .insert(entry)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: funnelDiaryKeys.list(data.funnel_id) });
    },
  });
}

// ========== CHECKLIST HOOKS ==========
export function useFunnelChecklist(funnelId: string) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: funnelChecklistKeys.list(funnelId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_checklist")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("Error fetching funnel checklist:", error);
        return [];
      }
      return data as FunnelChecklistItem[];
    },
    enabled: authReady && !!session && !!funnelId,
  });
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: FunnelChecklistInsert) => {
      const { data, error } = await supabase
        .from("funnel_checklist")
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: funnelChecklistKeys.list(data.funnel_id) });
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, funnelId, ...updates }: { id: string; funnelId: string; is_completed?: boolean; title?: string }) => {
      const { data, error } = await supabase
        .from("funnel_checklist")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, funnelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: funnelChecklistKeys.list(data.funnelId) });
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, funnelId }: { id: string; funnelId: string }) => {
      const { error } = await supabase
        .from("funnel_checklist")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { funnelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: funnelChecklistKeys.list(data.funnelId) });
    },
  });
}
