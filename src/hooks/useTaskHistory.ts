import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TaskHistory } from "@/types/tasks";

import { useAuth } from "@/contexts/AuthContext";

export function useTaskHistory(taskId: string | null) {
  const { authReady, session } = useAuth();
  return useQuery({
    queryKey: ["task-history", taskId],
    queryFn: async () => {
      console.log("🔥 loadData disparado useTaskHistory", session?.user?.id);
      const { data, error } = await supabase
        .from("task_history")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TaskHistory[];
    },
    enabled: authReady && !!session && !!taskId,
  });
}
