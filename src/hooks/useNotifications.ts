import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
  recipient_id: string | null;
  sender_id: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  sender?: {
    full_name: string;
    display_name: string | null;
  };
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "alert";
  recipient_id?: string | null; // null = todos
}

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unread: () => [...notificationKeys.all, "unread"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

export function useNotifications() {
  const { user, authReady } = useAuth();

  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      console.log("🔥 loadData disparado useNotifications", user?.id);
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          sender:profiles!notifications_sender_id_fkey(full_name, display_name)
        `)
        .or(`recipient_id.eq.${user?.id},recipient_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }
      return data as Notification[];
    },
    enabled: authReady && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: false, // Desabilitar refetch automatico
  });
}

export function useUnreadNotifications() {
  const { user, authReady } = useAuth();

  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: async () => {
      console.log("🔥 loadData disparado useUnreadNotifications", user?.id);
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          sender:profiles!notifications_sender_id_fkey(full_name, display_name)
        `)
        .or(`recipient_id.eq.${user?.id},recipient_id.is.null`)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching unread notifications:", error);
        return [];
      }
      return data as Notification[];
    },
    enabled: authReady && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: false, // Desabilitado para performance
  });
}

export function useUnreadCount() {
  const { user, authReady } = useAuth();

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      console.log("🔥 loadData disparado useUnreadCount", user?.id);
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .or(`recipient_id.eq.${user?.id},recipient_id.is.null`)
        .eq("read", false);

      if (error) {
        console.error("Error fetching unread count:", error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: authReady && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: false, // Desabilitado para performance
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .or(`recipient_id.eq.${user?.id},recipient_id.is.null`)
        .eq("read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateNotificationInput) => {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          title: input.title,
          message: input.message,
          type: input.type || "info",
          recipient_id: input.recipient_id ?? null,
          sender_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}
