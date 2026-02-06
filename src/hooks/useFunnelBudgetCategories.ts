import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FunnelBudgetCategory {
  id: string;
  funnel_id: string;
  name: string;
  percent: number;
  color: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export const budgetCategoryKeys = {
  all: ["funnel_budget_categories"] as const,
  list: (funnelId: string) => [...budgetCategoryKeys.all, "list", funnelId] as const,
};

export function useFunnelBudgetCategories(funnelId: string) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: budgetCategoryKeys.list(funnelId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_budget_categories")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("Error fetching budget categories:", error);
        return [];
      }
      return data as FunnelBudgetCategory[];
    },
    enabled: authReady && !!session && !!funnelId,
  });
}

export function useCreateBudgetCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: {
      funnel_id: string;
      name: string;
      percent?: number;
      color?: string;
      order_index?: number;
    }) => {
      const { data, error } = await supabase
        .from("funnel_budget_categories")
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: budgetCategoryKeys.list(data.funnel_id) });
    },
  });
}

export function useUpdateBudgetCategory() {
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
      percent?: number;
      color?: string;
    }) => {
      const { data, error } = await supabase
        .from("funnel_budget_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, funnelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: budgetCategoryKeys.list(data.funnelId) });
    },
  });
}

export function useDeleteBudgetCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, funnelId }: { id: string; funnelId: string }) => {
      const { error } = await supabase
        .from("funnel_budget_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { funnelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: budgetCategoryKeys.list(data.funnelId) });
    },
  });
}
