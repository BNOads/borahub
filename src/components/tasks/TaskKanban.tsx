import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  User,
  ListTodo,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskWithSubtasks, TaskPriority } from "@/types/tasks";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

interface TaskKanbanProps {
  tasks: TaskWithSubtasks[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onChangePriority?: (id: string, newPriority: TaskPriority) => void;
  isLoading?: boolean;
}

const priorityOrder: Record<TaskPriority, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

export function TaskKanban({
  tasks,
  onToggleComplete,
  onChangePriority,
  isLoading,
}: TaskKanbanProps) {
  const [activeTask, setActiveTask] = useState<TaskWithSubtasks | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columns = [
    {
      id: "alta" as TaskPriority,
      title: "Alta Prioridade",
      color: "border-destructive",
      bgColor: "bg-destructive/5",
      dropColor: "bg-destructive/20",
      tasks: tasks
        .filter((t) => !t.completed && t.priority === "alta")
        .sort((a, b) => {
          if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
          if (a.due_date) return -1;
          if (b.due_date) return 1;
          return 0;
        }),
    },
    {
      id: "media" as TaskPriority,
      title: "Média Prioridade",
      color: "border-warning",
      bgColor: "bg-warning/5",
      dropColor: "bg-warning/20",
      tasks: tasks
        .filter((t) => !t.completed && t.priority === "media")
        .sort((a, b) => {
          if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
          if (a.due_date) return -1;
          if (b.due_date) return 1;
          return 0;
        }),
    },
    {
      id: "baixa" as TaskPriority,
      title: "Baixa Prioridade",
      color: "border-muted-foreground",
      bgColor: "bg-muted/30",
      dropColor: "bg-muted/50",
      tasks: tasks
        .filter((t) => !t.completed && t.priority === "baixa")
        .sort((a, b) => {
          if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
          if (a.due_date) return -1;
          if (b.due_date) return 1;
          return 0;
        }),
    },
    {
      id: "completed" as const,
      title: "Concluídas",
      color: "border-success",
      bgColor: "bg-success/5",
      dropColor: "bg-success/20",
      tasks: tasks.filter((t) => t.completed),
    },
  ];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.getTime() === today.getTime()) return "Hoje";
    if (date.getTime() === tomorrow.getTime()) return "Amanhã";
    if (date.getTime() === yesterday.getTime()) return "Ontem";
    
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const isOverdue = (dateString: string | null, completed: boolean) => {
    if (!dateString || completed) return false;
    const date = new Date(dateString + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Check if dropped on a column
    const targetColumnId = over.id as string;
    const validPriorities: TaskPriority[] = ["alta", "media", "baixa"];
    
    if (targetColumnId === "completed") {
      // Toggle to completed
      if (!task.completed) {
        onToggleComplete(taskId, false);
      }
    } else if (validPriorities.includes(targetColumnId as TaskPriority)) {
      const newPriority = targetColumnId as TaskPriority;
      
      // If task was completed, uncomplete it
      if (task.completed) {
        onToggleComplete(taskId, true);
      }
      
      // Change priority if different
      if (task.priority !== newPriority && onChangePriority) {
        onChangePriority(taskId, newPriority);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 animate-pulse"
          >
            <div className="h-6 w-32 bg-muted rounded mb-4" />
            <div className="space-y-3">
              <div className="h-24 bg-muted rounded" />
              <div className="h-24 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            onToggleComplete={onToggleComplete}
            formatDate={formatDate}
            isOverdue={isOverdue}
            isActive={!!activeTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="opacity-90">
            <KanbanCard
              task={activeTask}
              onToggle={onToggleComplete}
              formatDate={formatDate}
              isOverdue={isOverdue}
              isDragging
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  column: {
    id: TaskPriority | "completed";
    title: string;
    color: string;
    bgColor: string;
    dropColor: string;
    tasks: TaskWithSubtasks[];
  };
  onToggleComplete: (id: string, completed: boolean) => void;
  formatDate: (date: string | null) => string;
  isOverdue: (date: string | null, completed: boolean) => boolean;
  isActive: boolean;
}

function KanbanColumn({
  column,
  onToggleComplete,
  formatDate,
  isOverdue,
  isActive,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useSortable({
    id: column.id,
    data: { type: "column" },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border-2 p-4 min-h-[400px] transition-colors",
        column.color,
        isOver ? column.dropColor : column.bgColor,
        isActive && "ring-2 ring-primary/20"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{column.title}</h3>
        <Badge variant="secondary">{column.tasks.length}</Badge>
      </div>

      <SortableContext
        items={column.tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {column.tasks.map((task) => (
            <DraggableKanbanCard
              key={task.id}
              task={task}
              onToggle={onToggleComplete}
              formatDate={formatDate}
              isOverdue={isOverdue}
            />
          ))}

          {column.tasks.length === 0 && (
            <div className={cn(
              "text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg transition-colors",
              isOver && "border-primary bg-primary/5"
            )}>
              {isOver ? "Soltar aqui" : "Nenhuma tarefa"}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

interface DraggableKanbanCardProps {
  task: TaskWithSubtasks;
  onToggle: (id: string, completed: boolean) => void;
  formatDate: (date: string | null) => string;
  isOverdue: (date: string | null, completed: boolean) => boolean;
}

function DraggableKanbanCard({
  task,
  onToggle,
  formatDate,
  isOverdue,
}: DraggableKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50")}
    >
      <KanbanCard
        task={task}
        onToggle={onToggle}
        formatDate={formatDate}
        isOverdue={isOverdue}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

interface KanbanCardProps {
  task: TaskWithSubtasks;
  onToggle: (id: string, completed: boolean) => void;
  formatDate: (date: string | null) => string;
  isOverdue: (date: string | null, completed: boolean) => boolean;
  isDragging?: boolean;
  dragHandleProps?: Record<string, any>;
}

function KanbanCard({
  task,
  onToggle,
  formatDate,
  isOverdue,
  isDragging,
  dragHandleProps,
}: KanbanCardProps) {
  const subtaskCount = task.subtasks?.length || 0;
  const completedSubtasks =
    task.subtasks?.filter((s) => s.completed).length || 0;
  const subtaskProgress =
    subtaskCount > 0 ? (completedSubtasks / subtaskCount) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        task.completed && "opacity-60",
        isDragging && "shadow-lg ring-2 ring-primary"
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-0.5"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggle(task.id, task.completed)}
          className="mt-0.5"
        />
        <Link
          to={`/tarefas/${task.id}`}
          className={cn(
            "flex-1 font-medium text-sm hover:text-accent transition-colors group",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          {task.title}
          <ExternalLink className="h-3 w-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 ml-10">
          {task.description}
        </p>
      )}

      {/* Subtasks Progress */}
      {subtaskCount > 0 && (
        <div className="mb-2 ml-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <ListTodo className="h-3 w-3" />
            <span>
              {completedSubtasks}/{subtaskCount} subtarefas
            </span>
          </div>
          <Progress value={subtaskProgress} className="h-1" />
          {/* Show first 2 subtasks */}
          <div className="mt-1 space-y-0.5">
            {task.subtasks.slice(0, 2).map((subtask) => (
              <div
                key={subtask.id}
                className={cn(
                  "text-xs flex items-center gap-1",
                  subtask.completed && "line-through text-muted-foreground/60"
                )}
              >
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    subtask.completed ? "bg-success" : "bg-muted-foreground"
                  )}
                />
                <span className="truncate">{subtask.title}</span>
              </div>
            ))}
            {subtaskCount > 2 && (
              <span className="text-xs text-muted-foreground">
                +{subtaskCount - 2} mais
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 ml-10">
        {task.category && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {task.category}
          </Badge>
        )}

        {task.assignee && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{task.assignee}</span>
          </div>
        )}

        {task.due_date && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue(task.due_date, task.completed)
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            <Calendar className="h-3 w-3" />
            {formatDate(task.due_date)}
          </div>
        )}
      </div>
    </div>
  );
}
