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
            id, title, description, priority, category, assignee, assigned_to_id, due_date, due_time, completed, position, created_at, updated_at, completed_at, recurrence, recurrence_end_date, parent_task_id, is_recurring_instance,
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
        return (data || []) as TaskWithSubtasks[];
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
            id, title, description, priority, category, assignee, assigned_to_id, due_date, due_time, completed, position, created_at, updated_at, completed_at, recurrence, recurrence_end_date, parent_task_id, is_recurring_instance,
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
        return (data || []) as TaskWithSubtasks[];
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
      // Invalidar query do usuário assignee
      if (data.assignee) {
        queryClient.invalidateQueries({ queryKey: taskKeys.byUser(data.assignee) });
      }
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates, 
      previousAssignee,
      taskTitle 
    }: { 
      id: string; 
      updates: TaskUpdate;
      previousAssignee?: string | null;
      taskTitle?: string;
    }) => {
      // Só incluir completed_at se completed estiver sendo alterado explicitamente
      const updatePayload: Record<string, unknown> = { ...updates };
      if (typeof updates.completed === "boolean") {
        updatePayload.completed_at = updates.completed ? new Date().toISOString() : null;
      }

      const { data, error } = await supabase
        .from("tasks")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      // If assignee changed, send notification to the new assignee
      if (updates.assignee && updates.assignee !== previousAssignee) {
        // Find user id by full_name
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("full_name", updates.assignee)
          .single();
        
        if (profileData?.id) {
          await supabase
            .from("notifications")
            .insert({
              title: "Nova tarefa atribuída",
              message: `Você foi atribuído à tarefa: "${taskTitle || data.title}"`,
              type: "info",
              recipient_id: profileData.id,
            });
        }
      }
      
      return data as Task;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) });
      // Invalidar queries do usuário assignee (atual e anterior)
      if (data.assignee) {
        queryClient.invalidateQueries({ queryKey: taskKeys.byUser(data.assignee) });
      }
      if (variables.previousAssignee && variables.previousAssignee !== data.assignee) {
        queryClient.invalidateQueries({ queryKey: taskKeys.byUser(variables.previousAssignee) });
      }
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
      // Invalidar todas as queries por usuário
      queryClient.invalidateQueries({ queryKey: ["tasks", "user"] });
    },
  });
}

// Helper para calcular próxima data de recorrência
function getNextDueDate(currentDueDate: string, recurrenceType: string): string {
  const daysToAdd: Record<string, number> = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    semiannual: 182,
    yearly: 365,
  };
  const date = new Date(currentDueDate + "T00:00:00");
  date.setDate(date.getDate() + (daysToAdd[recurrenceType] || 1));
  return date.toISOString().split("T")[0];
}

export function useToggleTaskComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      // Primeiro, buscar a tarefa para verificar recorrência
      const { data: taskData, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Atualizar a tarefa como concluída
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

      // Se está sendo marcada como concluída E tem recorrência, criar próxima instância
      if (completed && taskData.recurrence && taskData.recurrence !== "none" && taskData.due_date) {
        const today = new Date().toISOString().split("T")[0];
        const nextDueDate = getNextDueDate(taskData.due_date, taskData.recurrence);

        // Verificar se já existe tarefa para essa data
        const { data: existingTask } = await supabase
          .from("tasks")
          .select("id")
          .eq("parent_task_id", id)
          .eq("due_date", nextDueDate)
          .single();

        // Verificar se próxima data está dentro do período de recorrência
        const withinEndDate = !taskData.recurrence_end_date || nextDueDate <= taskData.recurrence_end_date;

        if (!existingTask && withinEndDate) {
          // Criar nova tarefa recorrente
          const { error: insertError } = await supabase
            .from("tasks")
            .insert({
              title: taskData.title,
              description: taskData.description,
              priority: taskData.priority,
              category: taskData.category,
              assignee: taskData.assignee,
              assigned_to_id: taskData.assigned_to_id,
              due_date: nextDueDate,
              due_time: taskData.due_time,
              recurrence: taskData.recurrence,
              recurrence_end_date: taskData.recurrence_end_date,
              parent_task_id: id,
              is_recurring_instance: true,
              completed: false,
              position: taskData.position,
            });

          if (insertError) {
            console.error("Erro ao criar próxima tarefa recorrente:", insertError);
          } else {
            console.log(`Tarefa recorrente criada para ${nextDueDate}`);
          }
        }
      }

      return data as Task;
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const previousTasks = queryClient.getQueryData(taskKeys.lists());

      // Atualização otimística para todas as queries de tarefas
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

      // Atualização otimística para queries de usuários específicos (dashboard)
      queryClient.setQueriesData(
        { queryKey: ["tasks", "user"], exact: false },
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
      // Invalida também as queries por usuário (dashboard)
      queryClient.invalidateQueries({ queryKey: ["tasks", "user"] });
    },
  });
}

export function useUserTasks(userFullName: string | null) {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: taskKeys.byUser(userFullName ?? ""),
    queryFn: async () => {
      console.log("🔥 loadData disparado useUserTasks", userFullName);
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select(`
            id, title, description, priority, category, assignee, assigned_to_id, due_date, due_time, completed, position, created_at, updated_at, completed_at, recurrence, recurrence_end_date, parent_task_id, is_recurring_instance,
            subtasks (id, title, completed)
          `)
          .eq("assignee", userFullName)
          .order("completed", { ascending: true })
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching user tasks:", error);
          return [];
        }
        return (data || []) as TaskWithSubtasks[];
      } catch (error) {
        console.error("Exception in useUserTasks:", error);
        return [];
      }
    },
    enabled: authReady && !!session && !!userFullName,
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
