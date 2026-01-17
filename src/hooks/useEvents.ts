import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Types from Supabase
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
export type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

export interface EventFilters {
  search?: string;
  event_type?: string | "all";
  date_from?: string;
  date_to?: string;
}

export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters: Partial<EventFilters>) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  upcoming: () => [...eventKeys.all, "upcoming"] as const,
};

import { useAuth } from "@/contexts/AuthContext";

export function useEvents(filters?: Partial<EventFilters>) {
  const { authReady, session } = useAuth();
  return useQuery({
    queryKey: eventKeys.list(filters ?? {}),
    queryFn: async () => {
      console.log("🔥 loadData disparado useEvents", session?.user?.id);
      try {
        let query = supabase
          .from("events")
          .select("*")
          .order("event_date", { ascending: true })
          .order("event_time", { ascending: true });

        if (filters?.event_type && filters.event_type !== "all") {
          query = query.eq("event_type", filters.event_type);
        }
        if (filters?.date_from) {
          query = query.gte("event_date", filters.date_from);
        }
        if (filters?.date_to) {
          query = query.lte("event_date", filters.date_to);
        }
        if (filters?.search) {
          query = query.ilike("title", `%${filters.search}%`);
        }

        query = query.limit(200);

        const { data, error } = await query;
        if (error) {
          console.error("Error fetching events:", error);
          return [];
        }
        return data as Event[];
      } catch (error) {
        console.error("Exception in useEvents:", error);
        return [];
      }
    },
    retry: 0,
    staleTime: 15 * 60 * 1000, // 15 minutos
    enabled: authReady && !!session,
  });
}

export function useUpcomingEvents(limit: number = 5) {
  const { authReady, session } = useAuth();
  return useQuery({
    queryKey: eventKeys.upcoming(),
    queryFn: async () => {
      console.log("🔥 loadData disparado useUpcomingEvents", session?.user?.id);
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .gte("event_date", today)
          .order("event_date", { ascending: true })
          .order("event_time", { ascending: true })
          .limit(limit);

        if (error) {
          console.error("Error fetching upcoming events:", error);
          return [];
        }
        return data as Event[];
      } catch (error) {
        console.error("Exception in useUpcomingEvents:", error);
        return [];
      }
    },
    retry: 0,
    staleTime: 15 * 60 * 1000,
    enabled: authReady && !!session,
  });
}

export function useEvent(id: string | null) {
  const { authReady, session } = useAuth();
  return useQuery({
    queryKey: eventKeys.detail(id ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Event;
    },
    enabled: authReady && !!session && !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: EventInsert) => {
      const { data, error } = await supabase
        .from("events")
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.upcoming() });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: EventUpdate }) => {
      const { data, error } = await supabase
        .from("events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.id) });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.upcoming() });
    },
  });
}
