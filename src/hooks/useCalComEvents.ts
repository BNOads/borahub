import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Event } from "@/hooks/useEvents";

export type CalComEvent = Event & { source: 'calcom' };

export function useCalComEvents() {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: ["calcom-events"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fetch-calcom-events");

        if (error) {
          console.error("Error fetching Cal.com events:", error);
          return [];
        }

        return (data?.data || []) as CalComEvent[];
      } catch (error) {
        console.error("Exception in useCalComEvents:", error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: authReady && !!session,
  });
}
