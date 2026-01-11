import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  User,
  Flag,
  ListTodo,
  MessageSquare,
  History,
  Clock,
  Edit,
  Save,
  X,
} from "lucide-react";
import { useTask, useUpdateTask } from "@/hooks/useTasks";
import { SubtaskList } from "./SubtaskList";
import { CommentSection } from "./CommentSection";
import { HistoryTimeline } from "./HistoryTimeline";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { TaskPriority } from "@/types/tasks";

interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  category: string;
  assignee: string;
  dueDate: string;
}

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
}: TaskDetailDialogProps) {
  const { toast } = useToast();
  const { data: task, isLoading } = useTask(taskId);
  const updateTask = useUpdateTask();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<EditFormData>({
    title: "",
    description: "",
    priority: "media",
    category: "",
    assignee: "",
    dueDate: "",
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        category: task.category || "",
        assignee: task.assignee || "",
        dueDate: task.due_date || "",
      });
    }
  }, [task]);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!taskId || !task) return;

    if (!formData.title.trim()) {
      toast({ title: "Titulo obrigatorio", variant: "destructive" });
      return;
    }
    if (!formData.assignee.trim()) {
      toast({ title: "Responsavel obrigatorio", variant: "destructive" });
      return;
    }
    if (!formData.dueDate) {
      toast({ title: "Data obrigatoria", variant: "destructive" });
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: taskId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        category: formData.category.trim() || null,
        assignee: formData.assignee.trim(),
        due_date: formData.dueDate,
      });
      setIsEditing(false);
      toast({ title: "Tarefa atualizada" });
    } catch {
      toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        category: task.category || "",
        assignee: task.assignee || "",
        dueDate: task.due_date || "",
      });
    }
    setIsEditing(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta":
        return "border-destructive text-destructive";
      case "media":
        return "border-warning text-warning";
      case "baixa":
        return "border-muted-foreground text-muted-foreground";
      default:
        return "";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const isOverdue = (dateString: string | null, completed: boolean) => {
    if (!dateString || completed) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : task ? (
          <>
            <DialogHeader className="pb-4 border-b">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {isEditing ? (
                    <Input
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="text-xl font-semibold"
                      placeholder="Titulo da tarefa"
                    />
                  ) : (
                    <DialogTitle className="text-xl">{task.title}</DialogTitle>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {isEditing ? (
                      <Select
                        value={formData.priority}
                        onValueChange={(value: TaskPriority) =>
                          setFormData((prev) => ({ ...prev, priority: value }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="baixa">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="outline"
                        className={getPriorityColor(task.priority)}
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        {task.priority === "alta"
                          ? "Alta"
                          : task.priority === "media"
                          ? "Media"
                          : "Baixa"}
                      </Badge>
                    )}
                    {!isEditing && task.category && (
                      <Badge variant="secondary">{task.category}</Badge>
                    )}
                    {task.completed && (
                      <Badge variant="outline" className="border-success text-success">
                        Concluida
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={updateTask.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updateTask.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Salvar
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="details" className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details" className="text-xs sm:text-sm">
                  Detalhes
                </TabsTrigger>
                <TabsTrigger value="subtasks" className="text-xs sm:text-sm">
                  <ListTodo className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                  Subtarefas
                  {task.subtasks.length > 0 && (
                    <span className="ml-1 text-xs">({task.subtasks.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="comments" className="text-xs sm:text-sm">
                  <MessageSquare className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                  Comentarios
                  {task.task_comments.length > 0 && (
                    <span className="ml-1 text-xs">
                      ({task.task_comments.length})
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs sm:text-sm">
                  <History className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                  Historico
                </TabsTrigger>
              </TabsList>

              <div className="overflow-y-auto flex-1 pt-4">
                <TabsContent value="details" className="mt-0 space-y-4">
                  {task.description && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Descricao</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {task.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {task.assignee && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Responsavel
                          </p>
                          <p className="font-medium">{task.assignee}</p>
                        </div>
                      </div>
                    )}

                    {task.due_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar
                          className={cn(
                            "h-4 w-4",
                            isOverdue(task.due_date, task.completed)
                              ? "text-destructive"
                              : "text-muted-foreground"
                          )}
                        />
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Data de entrega
                          </p>
                          <p
                            className={cn(
                              "font-medium",
                              isOverdue(task.due_date, task.completed) &&
                                "text-destructive"
                            )}
                          >
                            {formatDate(task.due_date)}
                            {isOverdue(task.due_date, task.completed) && (
                              <span className="text-xs ml-1">(Atrasada)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Criada em {formatDate(task.created_at)}
                      </span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="subtasks" className="mt-0">
                  <SubtaskList taskId={task.id} subtasks={task.subtasks} />
                </TabsContent>

                <TabsContent value="comments" className="mt-0">
                  <CommentSection
                    taskId={task.id}
                    comments={task.task_comments}
                  />
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <HistoryTimeline history={task.task_history} />
                </TabsContent>
              </div>
            </Tabs>
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            Tarefa nao encontrada
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
