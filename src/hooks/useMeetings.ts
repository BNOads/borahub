import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  meeting_time: string | null;
  participants: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingWithBlocks extends Meeting {
  meeting_blocks: MeetingBlock[];
}

export interface MeetingBlock {
  id: string;
  meeting_id: string;
  content: string;
  order_index: number;
  linked_task_id: string | null;
  created_at: string;
  updated_at: string;
}

interface MeetingFilters {
  search?: string;
  month?: number;
  year?: number;
}

export function useMeetings(filters?: MeetingFilters) {
  return useQuery({
    queryKey: ["meetings", filters],
    queryFn: async () => {
      let query = supabase
        .from("meetings")
        .select("*")
        .order("meeting_date", { ascending: false });

      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      if (filters?.year && filters?.month) {
        const startDate = new Date(filters.year, filters.month - 1, 1);
        const endDate = new Date(filters.year, filters.month, 0);
        query = query
          .gte("meeting_date", startDate.toISOString().split("T")[0])
          .lte("meeting_date", endDate.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Meeting[];
    },
  });
}

export function useMeeting(id: string | undefined) {
  return useQuery({
    queryKey: ["meeting", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("meetings")
        .select(`
          *,
          meeting_blocks (*)
        `)
        .eq("id", id)
        .order("order_index", { referencedTable: "meeting_blocks", ascending: true })
        .single();

      if (error) throw error;
      return data as MeetingWithBlocks;
    },
    enabled: !!id,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { title: string; meeting_date: string }) => {
      const { data: meeting, error } = await supabase
        .from("meetings")
        .insert({
          title: data.title,
          meeting_date: data.meeting_date,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Criar bloco inicial automaticamente
      await supabase
        .from("meeting_blocks")
        .insert({
          meeting_id: meeting.id,
          content: "",
          order_index: 0,
        });

      return meeting as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Reunião criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating meeting:", error);
      toast.error("Erro ao criar reunião");
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Meeting> & { id: string }) => {
      const { error } = await supabase
        .from("meetings")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meeting", variables.id] });
    },
    onError: (error) => {
      console.error("Error updating meeting:", error);
      toast.error("Erro ao atualizar reunião");
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Reunião removida com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting meeting:", error);
      toast.error("Erro ao remover reunião");
    },
  });
}
