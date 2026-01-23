import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Subtask, SubtaskInsert, SubtaskUpdate } from "@/types/tasks";
import { taskKeys } from "./useTasks";

export function useCreateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subtask: SubtaskInsert) => {
      const { data, error } = await supabase
        .from("subtasks")
        .insert({
          task_id: subtask.task_id,
          title: subtask.title,
          completed: subtask.completed,
          position: subtask.position,
          parent_subtask_id: subtask.parent_subtask_id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Subtask;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.task_id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      taskId,
      updates,
    }: {
      id: string;
      taskId: string;
      updates: SubtaskUpdate;
    }) => {
      const { data, error } = await supabase
        .from("subtasks")
        .update({
          ...updates,
          completed_at: updates.completed ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Subtask;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase.from("subtasks").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
    },
  });
}

export function useToggleSubtaskComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      taskId,
      completed,
    }: {
      id: string;
      taskId: string;
      completed: boolean;
    }) => {
      const { data, error } = await supabase
        .from("subtasks")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Subtask;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
    },
  });
}
