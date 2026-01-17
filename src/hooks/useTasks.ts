import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Task,
  TaskInsert,
  TaskUpdate,
  TaskWithSubtasks,
  TaskWithRelations,
  TaskFilters,
} from "@/types/tasks";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters: Partial<TaskFilters>) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  today: () => [...taskKeys.all, "today"] as const,
  byUser: (userId: string) => [...taskKeys.all, "user", userId] as const,
};

export function useTasks(filters?: Partial<TaskFilters>) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: taskKeys.list(filters ?? {}),
    queryFn: async () => {
      console.log("🔥 loadData disparado useTasks", session?.user?.id);
      try {
      let query = supabase
          .from("tasks")
          .select(`
            id, title, description, priority, category, assignee, due_date, due_time, completed, position, created_at, updated_at, completed_at,
            subtasks (id, title, completed)
          `)
          .order("position", { ascending: true })
          .order("created_at", { ascending: false });

        if (filters?.priority && filters.priority !== "all") {
          query = query.eq("priority", filters.priority);
        }
        if (filters?.category && filters.category !== "all") {
          query = query.eq("category", filters.category);
        }
        if (filters?.assignee && filters.assignee !== "all") {
          query = query.eq("assignee", filters.assignee);
        }
        if (filters?.search) {
          query = query.ilike("title", `%${filters.search}%`);
        }

        query = query.limit(100);

        const { data, error } = await query;
        if (error) {
          console.error('Error fetching tasks:', error);
          return [];
        }
        // Map data to include default values for missing columns
        return (data || []).map((task: any) => ({
          ...task,
          recurrence: task.recurrence || null,
          recurrence_end_date: task.recurrence_end_date || null,
          assigned_to_id: task.assigned_to_id || null,
          parent_task_id: null,
          is_recurring_instance: false,
        })) as TaskWithSubtasks[];
      } catch (error) {
        console.error('Exception in useTasks:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: authReady && !!session,
  });
}

export function useTodaysTasks() {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: taskKeys.today(),
    queryFn: async () => {
      console.log("🔥 loadData disparado useTodaysTasks", session?.user?.id);
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select(`
            id, title, description, priority, category, assignee, due_date, due_time, completed, position, created_at, updated_at, completed_at,
            subtasks (id, title, completed)
          `)
          .lte("due_date", new Date().toISOString().split("T")[0])
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("priority", { ascending: true })
          .limit(20);

        if (error) {
          console.error('Error fetching today tasks:', error);
          return [];
        }
        // Map data to include default values for missing columns
        return (data || []).map((task: any) => ({
          ...task,
          recurrence: task.recurrence || null,
          recurrence_end_date: task.recurrence_end_date || null,
          assigned_to_id: task.assigned_to_id || null,
          parent_task_id: null,
          is_recurring_instance: false,
        })) as TaskWithSubtasks[];
      } catch (error) {
        console.error('Exception in useTodaysTasks:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos (antes era cacheTime)
    enabled: authReady && !!session,
  });
}

export function useTask(id: string | null) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: taskKeys.detail(id ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          subtasks (*),
          task_comments (*),
          task_history (*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as TaskWithRelations;
    },
    enabled: authReady && !!session && !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdate }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          ...updates,
          completed_at: updates.completed ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
    },
  });
}

export function useToggleTaskComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const previousTasks = queryClient.getQueryData(taskKeys.lists());

      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: TaskWithSubtasks[] | undefined) =>
          old?.map((task) =>
            task.id === id ? { ...task, completed } : task
          )
      );

      queryClient.setQueriesData(
        { queryKey: taskKeys.today() },
        (old: TaskWithSubtasks[] | undefined) =>
          old?.map((task) =>
            task.id === id ? { ...task, completed } : task
          )
      );

      return { previousTasks };
    },
    onError: (_, __, context) => {
      if (context?.previousTasks) {
        queryClient.setQueriesData(
          { queryKey: taskKeys.lists() },
          context.previousTasks
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
    },
  });
}

export function useUserTasks(userId: string | null) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: taskKeys.byUser(userId ?? ""),
    queryFn: async () => {
      console.log("🔥 loadData disparado useUserTasks", session?.user?.id);
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select(`
            id, title, description, priority, category, assignee, due_date, due_time, completed, position, created_at, updated_at, completed_at,
            subtasks (id, title, completed)
          `)
          .eq("assignee", userId)
          .order("completed", { ascending: true })
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching user tasks:", error);
          return [];
        }
        // Map data to include default values for missing columns
        return (data || []).map((task: any) => ({
          ...task,
          recurrence: task.recurrence || null,
          recurrence_end_date: task.recurrence_end_date || null,
          assigned_to_id: task.assigned_to_id || null,
          parent_task_id: null,
          is_recurring_instance: false,
        })) as TaskWithSubtasks[];
      } catch (error) {
        console.error("Exception in useUserTasks:", error);
        return [];
      }
    },
    enabled: authReady && !!session && !!userId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTaskForUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
      if (variables.assignee) {
        queryClient.invalidateQueries({ queryKey: taskKeys.byUser(variables.assignee) });
      }
    },
  });
}
