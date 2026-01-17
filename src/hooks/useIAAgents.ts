import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type IAAgent = Database["public"]["Tables"]["ia_agents"]["Row"];
export type IAAgentInsert = Database["public"]["Tables"]["ia_agents"]["Insert"];
export type IAAgentUpdate = Database["public"]["Tables"]["ia_agents"]["Update"];

export const iaAgentKeys = {
  all: ["ia_agents"] as const,
  list: () => [...iaAgentKeys.all, "list"] as const,
  detail: (id: string) => [...iaAgentKeys.all, "detail", id] as const,
};

export function useIAAgents() {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: iaAgentKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching IA agents:", error);
        return [];
      }
      return data as IAAgent[];
    },
    enabled: authReady && !!session,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateIAAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agent: IAAgentInsert) => {
      const { data, error } = await supabase
        .from("ia_agents")
        .insert(agent)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iaAgentKeys.all });
    },
  });
}

export function useUpdateIAAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: IAAgentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("ia_agents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iaAgentKeys.all });
    },
  });
}

export function useDeleteIAAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ia_agents")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iaAgentKeys.all });
    },
  });
}
