import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FunnelCustomDate {
  id: string;
  funnel_id: string;
  name: string;
  date: string;
  color: string;
  bg_color: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export const customDateKeys = {
  all: ["funnel_custom_dates"] as const,
  list: (funnelId: string) => [...customDateKeys.all, "list", funnelId] as const,
};

export function useFunnelCustomDates(funnelId: string) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: customDateKeys.list(funnelId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_custom_dates")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("Error fetching custom dates:", error);
        return [];
      }
      return data as FunnelCustomDate[];
    },
    enabled: authReady && !!session && !!funnelId,
  });
}

export function useAddFunnelCustomDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dateData: {
      funnel_id: string;
      name: string;
      date: string;
      color?: string;
      bg_color?: string;
      order_index?: number;
    }) => {
      const { data, error } = await supabase
        .from("funnel_custom_dates")
        .insert(dateData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customDateKeys.list(data.funnel_id) });
    },
  });
}

export function useUpdateFunnelCustomDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      funnelId,
      ...updates
    }: {
      id: string;
      funnelId: string;
      name?: string;
      date?: string;
      color?: string;
      bg_color?: string;
    }) => {
      const { data, error } = await supabase
        .from("funnel_custom_dates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, funnelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customDateKeys.list(data.funnelId) });
    },
  });
}

export function useDeleteFunnelCustomDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, funnelId }: { id: string; funnelId: string }) => {
      const { error } = await supabase
        .from("funnel_custom_dates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { funnelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customDateKeys.list(data.funnelId) });
    },
  });
}
