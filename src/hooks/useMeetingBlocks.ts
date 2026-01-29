import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MeetingBlock } from "./useMeetings";

export function useCreateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, content = "", orderIndex }: { meetingId: string; content?: string; orderIndex: number }) => {
      const { data, error } = await supabase
        .from("meeting_blocks")
        .insert({
          meeting_id: meetingId,
          content,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MeetingBlock;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meeting", variables.meetingId] });
    },
    onError: (error) => {
      console.error("Error creating block:", error);
      toast.error("Erro ao criar bloco");
    },
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, meetingId, ...data }: Partial<MeetingBlock> & { id: string; meetingId: string }) => {
      const { error } = await supabase
        .from("meeting_blocks")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meeting", variables.meetingId] });
    },
    onError: (error) => {
      console.error("Error updating block:", error);
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, meetingId }: { id: string; meetingId: string }) => {
      const { error } = await supabase
        .from("meeting_blocks")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meeting", variables.meetingId] });
    },
    onError: (error) => {
      console.error("Error deleting block:", error);
      toast.error("Erro ao remover bloco");
    },
  });
}

export function useReorderBlocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blocks, meetingId }: { blocks: { id: string; order_index: number }[]; meetingId: string }) => {
      // Update all blocks with their new order
      const updates = blocks.map((block) =>
        supabase
          .from("meeting_blocks")
          .update({ order_index: block.order_index })
          .eq("id", block.id)
      );

      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meeting", variables.meetingId] });
    },
    onError: (error) => {
      console.error("Error reordering blocks:", error);
      toast.error("Erro ao reordenar blocos");
    },
  });
}

export function useLinkBlockToTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blockId, taskId, meetingId }: { blockId: string; taskId: string; meetingId: string }) => {
      const { error } = await supabase
        .from("meeting_blocks")
        .update({ linked_task_id: taskId })
        .eq("id", blockId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meeting", variables.meetingId] });
      toast.success("Tarefa vinculada ao bloco!");
    },
    onError: (error) => {
      console.error("Error linking block to task:", error);
      toast.error("Erro ao vincular tarefa");
    },
  });
}
