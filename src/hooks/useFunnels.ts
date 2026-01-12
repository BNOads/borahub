import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const funnelKeys = {
  all: ["funnels"] as const,
  active: () => [...funnelKeys.all, "active"] as const,
  activeCount: () => [...funnelKeys.all, "active-count"] as const,
};

export function useActiveFunnelsCount() {
  return useQuery({
    queryKey: funnelKeys.activeCount(),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("funnels")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useActiveFunnels() {
  return useQuery({
    queryKey: funnelKeys.active(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnels")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
