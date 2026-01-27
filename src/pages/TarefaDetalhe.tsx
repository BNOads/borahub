import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
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
  Trash2,
  Link as LinkIcon,
  Copy,
  Repeat,
} from "lucide-react";
import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskComplete,
} from "@/hooks/useTasks";
import { SubtaskList } from "@/components/tasks/SubtaskList";
import { CommentSection } from "@/components/tasks/CommentSection";
import { HistoryTimeline } from "@/components/tasks/HistoryTimeline";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskFormData, RecurrenceType } from "@/types/tasks";
import { RECURRENCE_LABELS } from "@/types/tasks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const categories = [
  "Lancamento",
  "Marketing",
  "Vendas",
  "Suporte",
  "Administrativo",
];

export default function TarefaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authReady, session } = useAuth();

  const { data: task, isLoading, error } = useTask(id || null);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const toggleComplete = useToggleTaskComplete();

  // Buscar usuarios reais do banco
  const { data: users = [] } = useQuery({
    queryKey: ["profiles-for-task-detail"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, avatar_url")
        .eq("is_active", true)
        .order("full_name");

      if (error) return [];
      return data;
    },
    enabled: authReady && !!session,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<TaskFormData | null>(null);

  const startEditing = () => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        category: task.category || "",
        assignee: task.assignee || "",
        dueDate: task.due_date || "",
        dueTime: task.due_time || "",
        recurrence: (task.recurrence as RecurrenceType) || "none",
        recurrenceEndDate: task.recurrence_end_date || "",
      });
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setFormData(null);
  };

  const handleSave = async () => {
    if (!formData || !task || !formData.title.trim()) return;
    if (!formData.assignee || !formData.dueDate) {
      toast({
        title: "Campos obrigatorios",
        description: "Responsavel e Data de entrega sao obrigatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: task.id,
        updates: {
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          category: formData.category || null,
          assignee: formData.assignee,
          due_date: formData.dueDate,
          due_time: formData.dueTime || null,
        },
      });
      toast({ title: "Tarefa atualizada" });
      setIsEditing(false);
      setFormData(null);
    } catch {
      toast({
        title: "Erro ao atualizar tarefa",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    try {
      await deleteTask.mutateAsync(task.id);
      toast({ title: "Tarefa excluida" });
      navigate("/tarefas");
    } catch {
      toast({
        title: "Erro ao excluir tarefa",
        variant: "destructive",
      });
    }
  };

  const handleToggleComplete = async () => {
    if (!task) return;
    try {
      await toggleComplete.mutateAsync({
        id: task.id,
        completed: !task.completed,
      });
    } catch {
      toast({
        title: "Erro ao atualizar tarefa",
        variant: "destructive",
      });
    }
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
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
    // Handle both date-only strings (YYYY-MM-DD) and full timestamps
    const isTimestamp = dateString.includes('T') || dateString.includes(' ');
    const date = isTimestamp ? new Date(dateString) : new Date(dateString + "T00:00:00");
    
    if (isNaN(date.getTime())) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateOnly.getTime() === today.getTime()) return "Hoje";
    if (dateOnly.getTime() === tomorrow.getTime()) return "Amanhã";
    if (dateOnly.getTime() === yesterday.getTime()) return "Ontem";
    
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const isOverdue = (dateString: string | null, completed: boolean) => {
    if (!dateString || completed) return false;
    const date = new Date(dateString + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive mb-4">Tarefa nao encontrada</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const subtaskCount = task.subtasks?.length || 0;
  const completedSubtasks =
    task.subtasks?.filter((s) => s.completed).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Detalhes da Tarefa</h1>
            <Button variant="ghost" size="icon" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <LinkIcon className="h-3 w-3" />
            /tarefas/{id}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={cancelEditing}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateTask.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={startEditing}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Info Card */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4 mb-6">
              <Checkbox
                checked={task.completed}
                onCheckedChange={handleToggleComplete}
                className="mt-1 h-5 w-5"
              />
              <div className="flex-1">
                {isEditing && formData ? (
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) =>
                        prev ? { ...prev, title: e.target.value } : null
                      )
                    }
                    className="text-xl font-semibold"
                  />
                ) : (
                  <h2
                    className={cn(
                      "text-xl font-semibold",
                      task.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </h2>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {isEditing && formData ? (
                <Select
                  value={formData.priority}
                  onValueChange={(value: TaskPriority) =>
                    setFormData((prev) =>
                      prev ? { ...prev, priority: value } : null
                    )
                  }
                >
                  <SelectTrigger className="w-[120px]">
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

              {isEditing && formData ? (
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) =>
                      prev ? { ...prev, category: value } : null
                    )
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                task.category && (
                  <Badge variant="secondary">{task.category}</Badge>
                )
              )}

              {task.completed && (
                <Badge variant="outline" className="border-success text-success">
                  Concluida
                </Badge>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Descricao</Label>
              {isEditing && formData ? (
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) =>
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                  placeholder="Descreva a tarefa..."
                  rows={4}
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description || "Sem descricao"}
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="subtasks" className="rounded-xl border border-border bg-card">
            <TabsList className="w-full justify-start border-b rounded-none px-4 pt-2">
              <TabsTrigger value="subtasks">
                <ListTodo className="h-4 w-4 mr-2" />
                Subtarefas
                {subtaskCount > 0 && (
                  <span className="ml-1 text-xs">
                    ({completedSubtasks}/{subtaskCount})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="comments">
                <MessageSquare className="h-4 w-4 mr-2" />
                Comentarios
                {task.task_comments.length > 0 && (
                  <span className="ml-1 text-xs">
                    ({task.task_comments.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                Historico
              </TabsTrigger>
            </TabsList>

            <div className="p-4">
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Detalhes</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Responsavel *
                </Label>
                {isEditing && formData ? (
                  <Select
                    value={formData.assignee}
                    onValueChange={(value) =>
                      setFormData((prev) =>
                        prev ? { ...prev, assignee: value } : null
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.full_name}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{task.assignee}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  className={cn(
                    "text-xs flex items-center gap-1",
                    isOverdue(task.due_date, task.completed)
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  Data de entrega *
                </Label>
                {isEditing && formData ? (
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData((prev) =>
                        prev ? { ...prev, dueDate: e.target.value } : null
                      )
                    }
                  />
                ) : (
                  <p
                    className={cn(
                      "font-medium",
                      isOverdue(task.due_date, task.completed) && "text-destructive"
                    )}
                  >
                    {formatDate(task.due_date)}
                    {isOverdue(task.due_date, task.completed) && (
                      <span className="text-xs ml-1">(Atrasada)</span>
                    )}
                  </p>
                )}
              </div>

              {/* Recurrence Info */}
              {task.recurrence && task.recurrence !== "none" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Repeat className="h-3 w-3" />
                    Recorrência
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-accent text-accent">
                      {RECURRENCE_LABELS[task.recurrence as RecurrenceType]}
                    </Badge>
                  </div>
                  {task.recurrence_end_date && (
                    <p className="text-xs text-muted-foreground">
                      Até {formatDate(task.recurrence_end_date)}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Criada em {formatDate(task.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Subtasks Preview */}
          {subtaskCount > 0 && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Subtarefas
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">
                    {completedSubtasks}/{subtaskCount}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{
                      width: `${(completedSubtasks / subtaskCount) * 100}%`,
                    }}
                  />
                </div>
                <div className="space-y-1 pt-2">
                  {task.subtasks.slice(0, 3).map((subtask) => (
                    <div
                      key={subtask.id}
                      className={cn(
                        "text-sm flex items-center gap-2",
                        subtask.completed && "line-through text-muted-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          subtask.completed ? "bg-success" : "bg-muted-foreground"
                        )}
                      />
                      <span className="truncate">{subtask.title}</span>
                    </div>
                  ))}
                  {subtaskCount > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{subtaskCount - 3} mais
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
