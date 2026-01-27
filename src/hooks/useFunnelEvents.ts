import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Event } from "./useEvents";

// Query keys
export const funnelEventsKeys = {
  all: ["funnel_events"] as const,
  list: (funnelId: string) => [...funnelEventsKeys.all, "list", funnelId] as const,
};

export interface FunnelEventWithDetails {
  id: string;
  funnel_id: string;
  event_id: string;
  created_at: string;
  event: Event;
}

export function useFunnelEvents(funnelId: string) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: funnelEventsKeys.list(funnelId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_events")
        .select(`
          id,
          funnel_id,
          event_id,
          created_at,
          event:events(*)
        `)
        .eq("funnel_id", funnelId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching funnel events:", error);
        return [];
      }

      // Type assertion for the joined data
      return (data as unknown as FunnelEventWithDetails[]) || [];
    },
    enabled: authReady && !!session && !!funnelId,
  });
}

export function useAddFunnelEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ funnelId, eventId }: { funnelId: string; eventId: string }) => {
      const { data, error } = await supabase
        .from("funnel_events")
        .insert({
          funnel_id: funnelId,
          event_id: eventId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: funnelEventsKeys.list(data.funnel_id) });
    },
  });
}

export function useRemoveFunnelEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, funnelId }: { id: string; funnelId: string }) => {
      const { error } = await supabase
        .from("funnel_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { funnelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: funnelEventsKeys.list(data.funnelId) });
    },
  });
}
