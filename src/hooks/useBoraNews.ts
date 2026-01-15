import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type BoraNews = Database["public"]["Tables"]["bora_news"]["Row"];
export type BoraNewsInsert = Database["public"]["Tables"]["bora_news"]["Insert"];
export type BoraNewsLeitura = Database["public"]["Tables"]["bora_news_leitura"]["Row"];

export interface BoraNewsWithLeitura extends BoraNews {
  lido?: boolean;
}

const USER_ID_KEY = "bora_news_user_id";

function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

export const boraNewsKeys = {
  all: ["bora_news"] as const,
  list: () => [...boraNewsKeys.all, "list"] as const,
  published: () => [...boraNewsKeys.all, "published"] as const,
  detail: (id: string) => [...boraNewsKeys.all, "detail", id] as const,
  leitura: () => [...boraNewsKeys.all, "leitura"] as const,
};

export function useBoraNewsList(onlyPublished = true) {
  return useQuery({
    queryKey: onlyPublished ? boraNewsKeys.published() : boraNewsKeys.list(),
    queryFn: async () => {
      const userId = getUserId();

      let query = supabase
        .from("bora_news")
        .select("*")
        .order("destaque", { ascending: false })
        .order("data_publicacao", { ascending: false });

      if (onlyPublished) {
        query = query.eq("status_publicacao", "publicado");
      }

      const { data: news, error } = await query;
      if (error) throw error;

      const { data: leituras } = await supabase
        .from("bora_news_leitura")
        .select("*")
        .eq("user_id", userId);

      const leituraMap = new Map(
        (leituras || []).map((l) => [l.bora_news_id, l.lido])
      );

      const newsWithLeitura: BoraNewsWithLeitura[] = (news || []).map((n) => ({
        ...n,
        lido: leituraMap.get(n.id) ?? false,
      }));

      return newsWithLeitura;
    },
  });
}

export function useBoraNewsDetail(id: string) {
  return useQuery({
    queryKey: boraNewsKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bora_news")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useBoraNewsUnreadCount() {
  return useQuery({
    queryKey: [...boraNewsKeys.all, "unread_count"],
    queryFn: async () => {
      const userId = getUserId();

      const { data: news, error: newsError } = await supabase
        .from("bora_news")
        .select("id")
        .eq("status_publicacao", "publicado");

      if (newsError) throw newsError;

      const { data: leituras, error: leituraError } = await supabase
        .from("bora_news_leitura")
        .select("bora_news_id")
        .eq("user_id", userId)
        .eq("lido", true);

      if (leituraError) throw leituraError;

      const readIds = new Set((leituras || []).map((l) => l.bora_news_id));
      const unreadCount = (news || []).filter((n) => !readIds.has(n.id)).length;

      return unreadCount;
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boraNewsId: string) => {
      const userId = getUserId();

      const { data: existing } = await supabase
        .from("bora_news_leitura")
        .select("*")
        .eq("bora_news_id", boraNewsId)
        .eq("user_id", userId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("bora_news_leitura")
          .update({ lido: true, data_leitura: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bora_news_leitura").insert({
          bora_news_id: boraNewsId,
          user_id: userId,
          lido: true,
          data_leitura: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boraNewsKeys.all });
    },
  });
}

export function useToggleRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boraNewsId, lido }: { boraNewsId: string; lido: boolean }) => {
      const userId = getUserId();

      const { data: existing } = await supabase
        .from("bora_news_leitura")
        .select("*")
        .eq("bora_news_id", boraNewsId)
        .eq("user_id", userId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("bora_news_leitura")
          .update({
            lido,
            data_leitura: lido ? new Date().toISOString() : null
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bora_news_leitura").insert({
          bora_news_id: boraNewsId,
          user_id: userId,
          lido,
          data_leitura: lido ? new Date().toISOString() : null,
        });
        if (error) throw error;
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
      const { error } = await supabase.from("bora_news").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boraNewsKeys.all });
    },
  });
}
