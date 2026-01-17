import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const contentSettingsKeys = {
  all: ["content_settings"] as const,
  key: (key: string) => [...contentSettingsKeys.all, key] as const,
};

export function useContentSetting(key: string) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: contentSettingsKeys.key(key),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_settings")
        .select("*")
        .eq("key", key)
        .maybeSingle();

      if (error) {
        console.error("Error fetching content setting:", error);
        return null;
      }
      return data;
    },
    enabled: authReady && !!session && !!key,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateContentSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      // Tenta atualizar, se não existir, insere
      const { data: existing } = await supabase
        .from("content_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("content_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", key)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("content_settings")
          .insert({ key, value })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: contentSettingsKeys.key(variables.key) });
    },
  });
}
