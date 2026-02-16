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
            id, title, description, priority, category, assignee, assigned_to_id, due_date, due_time, completed, position, created_at, updated_at, completed_at, recurrence, recurrence_end_date, parent_task_id, is_recurring_instance, doing_since,
            subtasks (id, title, completed)
          `);

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

        // Reordenar para priorizar concluídas recentemente (completed_at DESC)
        // nullsFirst: true mantém pendentes no topo (completed_at = null)
        query = query
          .order("completed", { ascending: true })
          .order("completed_at", { ascending: false, nullsFirst: true })
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(600); // Aumentado para cobrir volume atual de tarefas

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
            id, title, description, priority, category, assignee, assigned_to_id, due_date, due_time, completed, position, created_at, updated_at, completed_at, recurrence, recurrence_end_date, parent_task_id, is_recurring_instance, doing_since,
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
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const insertData: any = {
        ...task,
        created_by_id: session?.user?.id, // Set creator
      };
      
      // If assigning to another user, find their ID
      if (task.assignee) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("full_name", task.assignee)
          .single();
        if (profile?.id) {
          insertData.assigned_to_id = profile.id;
        }
      }
      
      const { data, error } = await supabase
        .from("tasks")
        .insert(insertData)
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

      // Atualizar a tarefa como concluída (e limpar doing_since se estiver concluindo)
      const { data, error } = await supabase
        .from("tasks")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          doing_since: completed ? null : taskData.doing_since, // Limpar "fazendo" ao concluir
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // NOTA: A criação da próxima tarefa recorrente é feita pela Edge Function process-task-recurrence
      // que roda via cron job. Não criar aqui para evitar duplicatas.

      return data as Task;
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const previousTasks = queryClient.getQueryData(taskKeys.lists());

       // Importante: a tela de tarefas pode filtrar concluídas por `completed_at`.
       // Se fizermos update otimista apenas de `completed`, a tarefa pode “sumir”
       // até o refetch porque `completed_at` ainda está null.
       const optimisticCompletedAt = completed ? new Date().toISOString() : null;

      // Atualização otimística para todas as queries de tarefas
      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: TaskWithSubtasks[] | undefined) =>
          old?.map((task) =>
            task.id === id
              ? {
                  ...task,
                  completed,
                  completed_at: optimisticCompletedAt,
                  doing_since: completed ? null : task.doing_since,
                }
              : task
          )
      );

      queryClient.setQueriesData(
        { queryKey: taskKeys.today() },
        (old: TaskWithSubtasks[] | undefined) =>
          old?.map((task) =>
            task.id === id
              ? {
                  ...task,
                  completed,
                  completed_at: optimisticCompletedAt,
                  doing_since: completed ? null : task.doing_since,
                }
              : task
          )
      );

      // Atualização otimística para queries de usuários específicos (dashboard)
      queryClient.setQueriesData(
        { queryKey: ["tasks", "user"], exact: false },
        (old: TaskWithSubtasks[] | undefined) =>
          old?.map((task) =>
            task.id === id
              ? {
                  ...task,
                  completed,
                  completed_at: optimisticCompletedAt,
                  doing_since: completed ? null : task.doing_since,
                }
              : task
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
            id, title, description, priority, category, assignee, assigned_to_id, due_date, due_time, completed, position, created_at, updated_at, completed_at, recurrence, recurrence_end_date, parent_task_id, is_recurring_instance, doing_since,
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
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const insertData: any = {
        ...task,
        created_by_id: session?.user?.id,
      };
      
      // If assigning to a user, find their ID
      if (task.assignee) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("full_name", task.assignee)
          .single();
        if (profile?.id) {
          insertData.assigned_to_id = profile.id;
        }
      }
      
      const { data, error } = await supabase
        .from("tasks")
        .insert(insertData)
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

export function useCreateBulkTasks() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ tasks, assignee }: { tasks: TaskInsert[]; assignee: string }) => {
      // Sanitiza títulos - remove caracteres invisíveis e espaços extras
      const sanitizedTasks = tasks.map(task => ({
        ...task,
        title: task.title.replace(/[\u200B-\u200D\uFEFF]/g, '').trim(),
      }));

      // Valida que todos os títulos são válidos
      const invalidTasks = sanitizedTasks.filter(t => !t.title || t.title.length === 0);
      if (invalidTasks.length > 0) {
        throw new Error("Alguns títulos estão vazios após limpeza");
      }

      // Get assignee's ID
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("full_name", assignee)
        .single();

      const tasksToInsert = sanitizedTasks.map(task => ({
        ...task,
        created_by_id: session?.user?.id,
        assigned_to_id: profileData?.id,
      }));

      const { data, error } = await supabase
        .from("tasks")
        .insert(tasksToInsert)
        .select();

      if (error) {
        console.error("Erro ao inserir tarefas:", error);
        throw error;
      }

      // Enviar notificação única para o responsável (não bloqueia em caso de erro)
      if (data && data.length > 0) {
        try {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id")
            .eq("full_name", assignee)
            .single();

          if (profileData?.id) {
            const taskTitles = data.slice(0, 3).map(t => t.title);
            const remaining = data.length - 3;
            let message = taskTitles.map(t => `• ${t}`).join("\n");
            if (remaining > 0) {
              message += `\n... e mais ${remaining}`;
            }

            await supabase.from("notifications").insert({
              title: `${data.length} nova${data.length > 1 ? "s" : ""} tarefa${data.length > 1 ? "s" : ""} atribuída${data.length > 1 ? "s" : ""}`,
              message,
              type: "info",
              recipient_id: profileData.id,
            });
          }
        } catch (notifError) {
          // Notificação é secundária - não falha a operação principal
          console.error("Erro ao enviar notificação (não crítico):", notifError);
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
      queryClient.invalidateQueries({ queryKey: taskKeys.byUser(variables.assignee) });
      queryClient.invalidateQueries({ queryKey: ["tasks", "user"] });
    },
  });
}

export function useToggleTaskDoing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isDoing }: { id: string; isDoing: boolean }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          doing_since: isDoing ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onMutate: async ({ id, isDoing }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      // Atualização otimística
      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: TaskWithSubtasks[] | undefined) =>
          old?.map((task) =>
            task.id === id 
              ? { ...task, doing_since: isDoing ? new Date().toISOString() : null } 
              : task
          )
      );

      queryClient.setQueriesData(
        { queryKey: taskKeys.today() },
        (old: TaskWithSubtasks[] | undefined) =>
          old?.map((task) =>
            task.id === id 
              ? { ...task, doing_since: isDoing ? new Date().toISOString() : null } 
              : task
          )
      );

      queryClient.setQueriesData(
        { queryKey: ["tasks", "user"], exact: false },
        (old: TaskWithSubtasks[] | undefined) =>
          old?.map((task) =>
            task.id === id 
              ? { ...task, doing_since: isDoing ? new Date().toISOString() : null } 
              : task
          )
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
      queryClient.invalidateQueries({ queryKey: ["tasks", "user"] });
    },
  });
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      taskIds, 
      updates,
      newAssignee 
    }: { 
      taskIds: string[]; 
      updates: Record<string, unknown>;
      newAssignee?: string;
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .in("id", taskIds)
        .select();

      if (error) throw error;

      // Enviar notificação se mudou o responsável
      if (newAssignee && data && data.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("full_name", newAssignee)
          .single();

        if (profileData?.id) {
          const taskTitles = data.slice(0, 3).map(t => t.title);
          const remaining = data.length - 3;
          let message = taskTitles.map(t => `• ${t}`).join("\n");
          if (remaining > 0) {
            message += `\n... e mais ${remaining}`;
          }

          await supabase.from("notifications").insert({
            title: `${data.length} tarefa${data.length > 1 ? "s" : ""} atribuída${data.length > 1 ? "s" : ""} a você`,
            message,
            type: "info",
            recipient_id: profileData.id,
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
      queryClient.invalidateQueries({ queryKey: ["tasks", "user"] });
    },
  });
}

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      // Primeiro exclui subtarefas associadas
      const { error: subtasksError } = await supabase
        .from("subtasks")
        .delete()
        .in("task_id", taskIds);

      if (subtasksError) {
        console.error("Erro ao excluir subtarefas:", subtasksError);
      }

      // Depois exclui as tarefas
      const { error } = await supabase
        .from("tasks")
        .delete()
        .in("id", taskIds);

      if (error) throw error;

      return taskIds.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
      queryClient.invalidateQueries({ queryKey: ["tasks", "user"] });
    },
  });
}
