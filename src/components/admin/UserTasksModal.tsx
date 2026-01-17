import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Loader2,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  ListTodo,
} from "lucide-react";
import {
  useUserTasks,
  useCreateTaskForUser,
  useToggleTaskComplete,
} from "@/hooks/useTasks";
import type { Profile } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { RecurrenceType, RECURRENCE_LABELS } from "@/types/tasks";
import { Repeat } from "lucide-react";

interface UserTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile | null;
}

const priorityColors: Record<string, string> = {
  alta: "bg-red-500/20 text-red-400 border-red-500/30",
  media: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  baixa: "bg-green-500/20 text-green-400 border-green-500/30",
};

export function UserTasksModal({
  open,
  onOpenChange,
  user,
}: UserTasksModalProps) {
  const { toast } = useToast();
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "media" as "alta" | "media" | "baixa",
    due_date: "",
    recurrence: "none" as RecurrenceType,
    recurrence_end_date: "",
  });

  const { data: tasks = [], isLoading } = useUserTasks(user?.id ?? null);
  const createTask = useCreateTaskForUser();
  const toggleComplete = useToggleTaskComplete();

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !user) {
      toast({
        title: "Titulo obrigatorio",
        description: "Informe o titulo da tarefa.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTask.mutateAsync({
        title: newTask.title.trim(),
        description: newTask.description.trim() || null,
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        assignee: user.full_name,
      });

      toast({
        title: "Tarefa criada",
        description: `Tarefa atribuida a ${user.display_name || user.full_name}.`,
      });

      setNewTask({
        title: "",
        description: "",
        priority: "media",
        due_date: "",
        recurrence: "none",
        recurrence_end_date: "",
      });
      setShowNewTask(false);
    } catch (error: any) {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message || "Nao foi possivel criar a tarefa.",
        variant: "destructive",
      });
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      await toggleComplete.mutateAsync({ id: taskId, completed: !completed });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Nao foi possivel atualizar a tarefa.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split("T")[0];
    return dateStr < today;
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Tarefas de {user.display_name || user.full_name}
          </DialogTitle>
          <DialogDescription>
            Visualize e gerencie as tarefas atribuidas a este usuario.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Botao Nova Tarefa */}
          {!showNewTask ? (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowNewTask(true)}
            >
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
          ) : (
            <div className="border rounded-lg p-4 space-y-3 bg-accent/5">
              <div className="space-y-2">
                <Label htmlFor="task-title">Titulo *</Label>
                <Input
                  id="task-title"
                  placeholder="O que precisa ser feito?"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-description">Descricao</Label>
                <Textarea
                  id="task-description"
                  placeholder="Detalhes da tarefa (opcional)"
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="task-priority">Prioridade</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: "alta" | "media" | "baixa") =>
                      setNewTask({ ...newTask, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-date">Data de Entrega</Label>
                  <Input
                    id="task-date"
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) =>
                      setNewTask({ ...newTask, due_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="task-recurrence">Recorrencia</Label>
                  <Select
                    value={newTask.recurrence}
                    onValueChange={(value: RecurrenceType) =>
                      setNewTask({ ...newTask, recurrence: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newTask.recurrence !== "none" && (
                  <div className="space-y-2">
                    <Label htmlFor="task-recurrence-end">Data Limite</Label>
                    <Input
                      id="task-recurrence-end"
                      type="date"
                      placeholder="Opcional"
                      value={newTask.recurrence_end_date}
                      onChange={(e) =>
                        setNewTask({ ...newTask, recurrence_end_date: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewTask(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateTask}
                  disabled={createTask.isPending}
                >
                  {createTask.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Criar Tarefa"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Lista de Tarefas */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma tarefa atribuida</p>
              <p className="text-xs mt-1">
                Clique em "Nova Tarefa" para criar uma
              </p>
            </div>
          ) : (
            <>
              {/* Tarefas Pendentes */}
              {pendingTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Pendentes ({pendingTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/5 transition-colors"
                      >
                        <button
                          onClick={() =>
                            handleToggleComplete(task.id, task.completed)
                          }
                          className="mt-0.5"
                        >
                          <Circle className="h-5 w-5 text-muted-foreground hover:text-accent" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                priorityColors[task.priority]
                              )}
                            >
                              {task.priority}
                            </Badge>
                            {task.due_date && (
                              <span
                                className={cn(
                                  "text-xs flex items-center gap-1",
                                  isOverdue(task.due_date)
                                    ? "text-red-400"
                                    : "text-muted-foreground"
                                )}
                              >
                                <Calendar className="h-3 w-3" />
                                {formatDate(task.due_date)}
                              </span>
                            )}
                            {task.recurrence && task.recurrence !== "none" && (
                              <span className="text-xs flex items-center gap-1 text-accent">
                                <Repeat className="h-3 w-3" />
                                {RECURRENCE_LABELS[task.recurrence as RecurrenceType]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tarefas Concluidas */}
              {completedTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Concluidas ({completedTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {completedTasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 rounded-lg border opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <button
                          onClick={() =>
                            handleToggleComplete(task.id, task.completed)
                          }
                          className="mt-0.5"
                        >
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-through">
                            {task.title}
                          </p>
                        </div>
                      </div>
                    ))}
                    {completedTasks.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        + {completedTasks.length - 5} tarefas concluidas
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
