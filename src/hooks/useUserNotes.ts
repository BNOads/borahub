import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserNote {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useUserNote() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-note", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("user_notes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserNote | null;
    },
    enabled: !!user?.id,
  });
}

export function useSaveNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_notes")
        .upsert(
          {
            user_id: user.id,
            content,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data as UserNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-note", user?.id] });
    },
  });
}
