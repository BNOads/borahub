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
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { RichDescriptionEditor } from "./RichDescriptionEditor";
import { RichDescriptionView } from "./RichDescriptionView";
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
  CheckCircle2,
  Copy,
} from "lucide-react";
import { useTask, useUpdateTask, useToggleTaskComplete, useCreateTask } from "@/hooks/useTasks";
import { SubtaskList } from "./SubtaskList";
import { CommentSection } from "./CommentSection";
import { HistoryTimeline } from "./HistoryTimeline";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { TaskPriority } from "@/types/tasks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateFriendly, isOverdue as isOverdueUtil } from "@/lib/dateUtils";

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
  const { authReady, session } = useAuth();
  const { data: task, isLoading } = useTask(taskId);
  const updateTask = useUpdateTask();
  const toggleComplete = useToggleTaskComplete();
  const createTask = useCreateTask();

  // Fetch real users from database
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
    enabled: authReady && !!session && open,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [dupAssignee, setDupAssignee] = useState("");
  const [dupDate, setDupDate] = useState("");
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
        updates: {
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          category: formData.category.trim() || null,
          assignee: formData.assignee.trim(),
          due_date: formData.dueDate,
        },
        previousAssignee: task.assignee,
        taskTitle: formData.title.trim(),
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

  const handleToggleComplete = async () => {
    if (!taskId || !task) return;
    try {
      await toggleComplete.mutateAsync({ id: taskId, completed: !task.completed });
      toast({ title: task.completed ? "Tarefa reaberta" : "Tarefa concluída!" });
    } catch {
      toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
    }
  };

  const handleDuplicate = async () => {
    if (!task || !dupAssignee || !dupDate) {
      toast({ title: "Preencha responsável e data", variant: "destructive" });
      return;
    }
    try {
      await createTask.mutateAsync({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        category: task.category || "",
        assignee: dupAssignee,
        due_date: dupDate,
      });
      toast({ title: "Tarefa duplicada com sucesso!" });
      setShowDuplicate(false);
      setDupAssignee("");
      setDupDate("");
    } catch {
      toast({ title: "Erro ao duplicar tarefa", variant: "destructive" });
    }
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

  // Usa utilitário centralizado para formatação de data
  const formatDate = (dateString: string | null) => formatDateFriendly(dateString);

  // Usa utilitário centralizado para verificar atraso
  const isOverdue = (dateString: string | null, completed: boolean) =>
    isOverdueUtil(dateString, completed);

  return (
    <>
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={task.completed ? "outline" : "default"}
                        onClick={handleToggleComplete}
                        disabled={toggleComplete.isPending}
                        className={cn(
                          !task.completed && "bg-green-600 hover:bg-green-700"
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {task.completed ? "Reabrir" : "Concluir"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDupAssignee(task.assignee || "");
                          setDupDate(task.due_date || "");
                          setShowDuplicate(true);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Duplicar
                      </Button>
                    </div>
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
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Descricao
                        </label>
                        <RichDescriptionEditor
                          value={formData.description}
                          onChange={(val) =>
                            setFormData((prev) => ({
                              ...prev,
                              description: val,
                            }))
                          }
                          placeholder="Descrição da tarefa... Cole imagens (Ctrl+V) ou use os botões para anexar."
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Responsavel *
                          </label>
                          <Select
                            value={formData.assignee}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                assignee: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o responsável" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.full_name}>
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&size=24&background=random`}
                                      alt=""
                                      className="h-5 w-5 rounded-full object-cover shrink-0"
                                    />
                                    {user.full_name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Data de entrega *
                          </label>
                          <Input
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                dueDate: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Categoria
                        </label>
                        <Input
                          value={formData.category}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              category: e.target.value,
                            }))
                          }
                          placeholder="Ex: Marketing, Desenvolvimento"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {task.description && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Descricao</h4>
                          <RichDescriptionView description={task.description} />
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
                    </>
                  )}
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

      {/* Duplicate Task Modal */}
      <Dialog open={showDuplicate} onOpenChange={setShowDuplicate}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Duplicar Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Select value={dupAssignee} onValueChange={setDupAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.full_name}>
                      <div className="flex items-center gap-2">
                        <img
                          src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&size=24&background=random`}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover shrink-0"
                        />
                        {user.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de entrega *</Label>
              <Input
                type="date"
                value={dupDate}
                onChange={(e) => setDupDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDuplicate(false)}>
                Cancelar
              </Button>
              <Button onClick={handleDuplicate} disabled={createTask.isPending}>
                <Copy className="h-4 w-4 mr-1" />
                Duplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
