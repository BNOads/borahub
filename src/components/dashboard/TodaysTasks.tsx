import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Clock, AlertCircle, CheckCircle2, Repeat, Calendar, ChevronDown, ChevronRight, ClipboardList, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUserTasks, useToggleTaskComplete, useCreateTaskForUser } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { TaskWithSubtasks, TaskStatus, RecurrenceType } from "@/types/tasks";
import { RECURRENCE_LABELS } from "@/types/tasks";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";

const priorityColors = {
  alta: "bg-destructive/10 text-destructive border-destructive/20",
  media: "bg-warning/10 text-warning border-warning/20",
  baixa: "bg-muted text-muted-foreground border-muted",
};

const priorityLabels = {
  alta: "Alta",
  media: "Media",
  baixa: "Baixa",
};

export function TodaysTasks() {
  const { profile } = useAuth();
  const { data: tasks = [], isLoading } = useUserTasks(profile?.full_name ?? null);
  const toggleComplete = useToggleTaskComplete();
  const createTask = useCreateTaskForUser();

  // Track if notification was already shown for current "all completed" state
  const notificationShownRef = useRef(false);
  const previousCompletedRef = useRef<number | null>(null);

  // State for collapsible sections - all collapsed by default
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overdue: false,
    today: false,
    upcoming: false,
    "no-date": false,
    completed: false,
  });

  // State for quick task creation
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getTaskStatus = (task: TaskWithSubtasks): TaskStatus => {
    if (!task.due_date) return "no-date";
    // Usar format do date-fns para evitar problemas de timezone
    const today = format(new Date(), "yyyy-MM-dd");
    if (task.due_date < today) return "overdue";
    if (task.due_date === today) return "today";
    return "upcoming";
  };

  // Confetti animation when all tasks are completed
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  useEffect(() => {
    // Only trigger notification if:
    // 1. There are tasks
    // 2. All tasks are completed
    // 3. The completed count just increased (user completed the last task)
    // 4. Notification wasn't already shown for this state
    if (
      totalCount > 0 &&
      completedCount === totalCount &&
      previousCompletedRef.current !== null &&
      previousCompletedRef.current < completedCount &&
      !notificationShownRef.current
    ) {
      notificationShownRef.current = true;
      
      toast.success("🎉 Parabéns! Você concluiu todas as suas tarefas!");
    }

    // Reset notification shown flag when not all tasks are completed
    if (completedCount < totalCount) {
      notificationShownRef.current = false;
    }

    // Update previous completed count
    previousCompletedRef.current = completedCount;
  }, [completedCount, totalCount]);

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      await toggleComplete.mutateAsync({ id, completed: !completed });
    } catch {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleQuickAdd = async () => {
    if (!quickTaskTitle.trim() || !profile?.full_name) return;

    try {
      await createTask.mutateAsync({
        title: quickTaskTitle.trim(),
        assignee: profile.full_name,
        priority: "media",
        due_date: format(new Date(), "yyyy-MM-dd"),
      });
      setQuickTaskTitle("");
      setShowQuickAdd(false);
      toast.success("Tarefa criada com sucesso!");
    } catch {
      toast.error("Erro ao criar tarefa");
    }
  };

  const progressPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const groupedTasks = {
    overdue: tasks.filter(
      (t) => !t.completed && getTaskStatus(t) === "overdue"
    ),
    today: tasks.filter((t) => !t.completed && getTaskStatus(t) === "today"),
    upcoming: tasks.filter((t) => !t.completed && getTaskStatus(t) === "upcoming"),
    "no-date": tasks.filter(
      (t) => !t.completed && getTaskStatus(t) === "no-date"
    ),
    completed: tasks.filter((t) => t.completed),
  };

  if (isLoading) {
    return <TodaysTasksSkeleton />;
  }

  return (
    <div
      className="rounded-xl border border-border bg-card p-6 animate-slide-up"
      style={{ animationDelay: "0.2s" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Minhas Tarefas</h2>
          <p className="text-sm text-muted-foreground">
            {completedCount} de {totalCount} tarefas concluídas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="gold" size="sm" onClick={() => setShowQuickAdd(!showQuickAdd)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Tarefa
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/tarefas">
              <ClipboardList className="h-4 w-4 mr-1" />
              Ver Todas
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick add task form */}
      {showQuickAdd && (
        <div className="mb-6 p-4 rounded-lg border border-accent/30 bg-accent/5 animate-fade-in">
          <div className="flex gap-2">
            <Input
              placeholder="O que você precisa fazer?"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
              className="flex-1"
              autoFocus
            />
            <Button 
              variant="gold" 
              size="sm" 
              onClick={handleQuickAdd}
              disabled={!quickTaskTitle.trim() || createTask.isPending}
            >
              {createTask.isPending ? "..." : "Adicionar"}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setShowQuickAdd(false);
                setQuickTaskTitle("");
              }}
            >
              Cancelar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            A tarefa será criada para hoje com prioridade média
          </p>
        </div>
      )}

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso geral</span>
            <span className="text-sm text-accent font-semibold">
              {progressPercentage}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4">
            <ClipboardList className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhuma tarefa atribuída</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
            Você não possui tarefas no momento. Que tal criar uma agora?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button 
              variant="gold" 
              size="sm" 
              onClick={() => setShowQuickAdd(true)}
              className="gap-1"
            >
              <Sparkles className="h-4 w-4" />
              Criar tarefa rápida
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/tarefas">Ver todas as tarefas</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overdue tasks */}
          {groupedTasks.overdue.length > 0 && (
            <Collapsible open={openSections.overdue} onOpenChange={() => toggleSection("overdue")}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors">
                {openSections.overdue ? (
                  <ChevronDown className="h-4 w-4 text-destructive" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-destructive" />
                )}
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  Em atraso ({groupedTasks.overdue.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {groupedTasks.overdue.map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={handleToggle} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Today's tasks */}
          {groupedTasks.today.length > 0 && (
            <Collapsible open={openSections.today} onOpenChange={() => toggleSection("today")}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors">
                {openSections.today ? (
                  <ChevronDown className="h-4 w-4 text-accent" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-accent" />
                )}
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">
                  Hoje ({groupedTasks.today.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {groupedTasks.today.map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={handleToggle} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Upcoming tasks */}
          {groupedTasks.upcoming.length > 0 && (
            <Collapsible open={openSections.upcoming} onOpenChange={() => toggleSection("upcoming")}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors">
                {openSections.upcoming ? (
                  <ChevronDown className="h-4 w-4 text-blue-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-blue-500" />
                )}
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  Próximas ({groupedTasks.upcoming.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {groupedTasks.upcoming.map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={handleToggle} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* No date tasks */}
          {groupedTasks["no-date"].length > 0 && (
            <Collapsible open={openSections["no-date"]} onOpenChange={() => toggleSection("no-date")}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors">
                {openSections["no-date"] ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Sem data ({groupedTasks["no-date"].length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {groupedTasks["no-date"].map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={handleToggle} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Completed tasks */}
          {groupedTasks.completed.length > 0 && (
            <Collapsible open={openSections.completed} onOpenChange={() => toggleSection("completed")}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors">
                {openSections.completed ? (
                  <ChevronDown className="h-4 w-4 text-success" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-success" />
                )}
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">
                  Concluidas ({groupedTasks.completed.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {groupedTasks.completed.map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={handleToggle} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}

interface TaskItemProps {
  task: TaskWithSubtasks;
  onToggle: (id: string, completed: boolean) => void;
}

function TaskItem({ task, onToggle }: TaskItemProps) {
  const formatTime = (time: string | null) => {
    if (!time) return null;
    return time.substring(0, 5);
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    const dateObj = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateObj.getTime() === today.getTime()) return "Hoje";
    if (dateObj.getTime() === tomorrow.getTime()) return "Amanhã";
    if (dateObj.getTime() === yesterday.getTime()) return "Ontem";
    
    return dateObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const hasRecurrence = task.recurrence && task.recurrence !== "none";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border border-border transition-all hover:border-accent/30",
        task.completed && "opacity-60"
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id, task.completed)}
        className="mt-0.5 data-[state=checked]:bg-success data-[state=checked]:border-success"
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium text-sm truncate",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {task.due_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(task.due_date)}
            </span>
          )}
          {task.due_time && (
            <span className="text-xs text-muted-foreground">
              {formatTime(task.due_time)}
            </span>
          )}
          {hasRecurrence && (
            <span className="text-xs text-accent flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {RECURRENCE_LABELS[task.recurrence as RecurrenceType]}
            </span>
          )}
          {hasRecurrence && task.recurrence_end_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              até {formatDate(task.recurrence_end_date)}
            </span>
          )}
        </div>
      </div>
      <Badge variant="outline" className={cn("shrink-0", priorityColors[task.priority])}>
        {priorityLabels[task.priority]}
      </Badge>
    </div>
  );
}

function TodaysTasksSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-card p-6 animate-slide-up"
      style={{ animationDelay: "0.2s" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-8" />
        </div>
        <Skeleton className="h-2 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
