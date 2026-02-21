export type TaskPriority = "alta" | "media" | "baixa";

export type RecurrenceType = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "semiannual" | "yearly";

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: "Sem recorrência",
  daily: "Diário",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  semiannual: "Semestral",
  yearly: "Anual",
};

export type TaskHistoryAction =
  | "created"
  | "updated"
  | "completed"
  | "reopened"
  | "deleted";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  category: string | null;
  assignee: string | null;
  assigned_to_id?: string | null;
  due_date: string | null;
  due_time: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  position: number | null;
  recurrence?: RecurrenceType | null;
  recurrence_end_date?: string | null;
  parent_task_id?: string | null;
  is_recurring_instance?: boolean | null;
  doing_since?: string | null;
  ticket_id?: string | null;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  position: number;
  created_at: string;
  parent_subtask_id?: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  action: TaskHistoryAction;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  created_at: string;
}

export type TaskInsert = {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  category?: string | null;
  assignee?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  completed?: boolean;
  position?: number | null;
  recurrence?: RecurrenceType | null;
  recurrence_end_date?: string | null;
};

export type TaskUpdate = Partial<Omit<Task, "id" | "created_at" | "updated_at">>;

export type SubtaskInsert = Omit<Subtask, "id" | "created_at" | "completed_at">;

export interface SubtaskWithChildren extends Subtask {
  children: SubtaskWithChildren[];
}

export type SubtaskUpdate = Partial<Omit<Subtask, "id" | "created_at" | "task_id">>;

export type TaskCommentInsert = Omit<TaskComment, "id" | "created_at">;

export interface TaskWithSubtasks extends Task {
  subtasks: Subtask[];
}

export interface TaskWithRelations extends Task {
  subtasks: Subtask[];
  task_comments: TaskComment[];
  task_history: TaskHistory[];
}

export type TaskStatus = "overdue" | "today" | "upcoming" | "no-date";

export interface TaskFilters {
  search: string;
  priority: TaskPriority | "all";
  category: string | "all";
  assignee: string | "all";
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  category: string;
  assignee: string;
  dueDate: string;
  dueTime: string;
  recurrence: RecurrenceType;
  recurrenceEndDate: string;
}
