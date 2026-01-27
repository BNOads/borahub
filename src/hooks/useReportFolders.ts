import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ReportFolder {
  id: string;
  name: string;
  color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useReportFolders() {
  return useQuery({
    queryKey: ["report-folders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_folders")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as ReportFolder[];
    },
  });
}

export function useCreateReportFolder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; color?: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      const { data, error } = await supabase
        .from("report_folders")
        .insert({
          name: params.name,
          color: params.color || "#6366f1",
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-folders"] });
      toast({ title: "Pasta criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar pasta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateReportFolder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; name?: string; color?: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from("report_folders")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-folders"] });
      toast({ title: "Pasta atualizada!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar pasta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteReportFolder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("report_folders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-folders"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Pasta excluída!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir pasta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useMoveReportToFolder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { reportId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from("reports")
        .update({ folder_id: params.folderId })
        .eq("id", params.reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Relatório movido!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao mover relatório",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
