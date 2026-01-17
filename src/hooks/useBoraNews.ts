import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

// Types from Supabase
export type BoraNews = Database["public"]["Tables"]["bora_news"]["Row"];
export type BoraNewsInsert = Database["public"]["Tables"]["bora_news"]["Insert"];

export interface BoraNewsWithLeitura extends BoraNews {
  lido?: boolean;
}

export const boraNewsKeys = {
  all: ["bora_news"] as const,
  list: () => [...boraNewsKeys.all, "list"] as const,
  published: () => [...boraNewsKeys.all, "published"] as const,
  detail: (id: string) => [...boraNewsKeys.all, "detail", id] as const,
  leitura: () => [...boraNewsKeys.all, "leitura"] as const,
};

const queryOptions = {
  retry: 1,
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
};

export function useBoraNewsList(onlyPublished = true) {
  const { authReady, session, user } = useAuth();

  return useQuery({
    queryKey: onlyPublished ? boraNewsKeys.published() : boraNewsKeys.list(),
    queryFn: async (): Promise<BoraNewsWithLeitura[]> => {
      let query = supabase
        .from("bora_news")
        .select("*")
        .order("data_publicacao", { ascending: false });

      if (onlyPublished) {
        query = query.eq("status_publicacao", "publicado");
      }

      const { data: news, error } = await query;
      if (error) {
        console.error("Error fetching bora news:", error);
        return [];
      }

      // Busca leituras do usuário
      if (user?.id) {
        const { data: leituras } = await supabase
          .from("bora_news_leitura")
          .select("bora_news_id, lido")
          .eq("user_id", user.id);

        const leituraMap = new Map(leituras?.map(l => [l.bora_news_id, l.lido]) || []);
        return (news || []).map(n => ({
          ...n,
          lido: leituraMap.get(n.id) || false,
        }));
      }

      return (news || []).map(n => ({ ...n, lido: false }));
    },
    enabled: authReady && !!session,
    ...queryOptions,
  });
}

export function useBoraNewsDetail(id: string) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: boraNewsKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bora_news")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as BoraNews;
    },
    enabled: authReady && !!session && !!id,
  });
}

export function useBoraNewsUnreadCount() {
  const { authReady, session, user } = useAuth();

  return useQuery({
    queryKey: [...boraNewsKeys.all, "unread_count"],
    queryFn: async () => {
      const { data: news } = await supabase
        .from("bora_news")
        .select("id")
        .eq("status_publicacao", "publicado");

      if (!news || news.length === 0) return 0;

      const { data: leituras } = await supabase
        .from("bora_news_leitura")
        .select("bora_news_id")
        .eq("user_id", user?.id || "")
        .eq("lido", true);

      const readIds = new Set(leituras?.map(l => l.bora_news_id) || []);
      return news.filter(n => !readIds.has(n.id)).length;
    },
    enabled: authReady && !!session && !!user,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (boraNewsId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data: existing } = await supabase
        .from("bora_news_leitura")
        .select("id")
        .eq("bora_news_id", boraNewsId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("bora_news_leitura")
          .update({ lido: true, data_leitura: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("bora_news_leitura").insert({
          bora_news_id: boraNewsId,
          user_id: user.id,
          lido: true,
          data_leitura: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boraNewsKeys.all });
    },
  });
}

export function useToggleRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ boraNewsId, lido }: { boraNewsId: string; lido: boolean }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data: existing } = await supabase
        .from("bora_news_leitura")
        .select("id")
        .eq("bora_news_id", boraNewsId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("bora_news_leitura")
          .update({ lido, data_leitura: lido ? new Date().toISOString() : null })
          .eq("id", existing.id);
      } else {
        await supabase.from("bora_news_leitura").insert({
          bora_news_id: boraNewsId,
          user_id: user.id,
          lido,
          data_leitura: lido ? new Date().toISOString() : null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boraNewsKeys.all });
    },
  });
}

export function useCreateBoraNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (news: BoraNewsInsert) => {
      const { data, error } = await supabase
        .from("bora_news")
        .insert(news)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boraNewsKeys.all });
    },
  });
}

export function useUpdateBoraNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BoraNews> & { id: string }) => {
      const { data, error } = await supabase
        .from("bora_news")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boraNewsKeys.all });
    },
  });
}

export function useDeleteBoraNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bora_news")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boraNewsKeys.all });
    },
  });
}
