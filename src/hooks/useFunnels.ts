import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const funnelKeys = {
  all: ["funnels"] as const,
  active: () => [...funnelKeys.all, "active"] as const,
  activeCount: () => [...funnelKeys.all, "active-count"] as const,
};

const queryOptions = {
  retry: 1,
  staleTime: 5 * 60 * 1000, // 5 minutos
  gcTime: 30 * 60 * 1000, // 30 minutos
};

export function useActiveFunnelsCount() {
  return useQuery({
    queryKey: funnelKeys.activeCount(),
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from("funnels")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        if (error) {
          console.error('Error fetching funnels count:', error);
          return 0;
        }
        return count ?? 0;
      } catch (error) {
        console.error('Exception in useActiveFunnelsCount:', error);
        return 0;
      }
    },
    ...queryOptions,
  });
}

export function useActiveFunnels() {
  return useQuery({
    queryKey: funnelKeys.active(),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("funnels")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error('Error fetching active funnels:', error);
          return [];
        }
        return data || [];
      } catch (error) {
        console.error('Exception in useActiveFunnels:', error);
        return [];
      }
    },
    ...queryOptions,
  });
}
