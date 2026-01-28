import { useState } from "react";
import { Link } from "react-router-dom";
import { format, startOfDay, endOfDay, parseISO, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Calendar,
  User,
  Users,
  Flag,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  ListTodo,
  LayoutList,
  LayoutGrid,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useTasks,
  useUserTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskComplete,
  useToggleTaskDoing,
} from "@/hooks/useTasks";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { AdminTasksPanel } from "@/components/tasks/AdminTasksPanel";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TasksByPersonView } from "@/components/tasks/TasksByPersonView";
import type { TaskPriority, TaskWithSubtasks, TaskFormData, RecurrenceType } from "@/types/tasks";
import { RECURRENCE_LABELS } from "@/types/tasks";
import { Repeat } from "lucide-react";
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

const emptyFormData: TaskFormData = {
  title: "",
  description: "",
  priority: "media",
  category: "",
  assignee: "",
  dueDate: "",
  dueTime: "",
  recurrence: "none",
  recurrenceEndDate: "",
};

type ViewMode = "list" | "kanban" | "by-person";
type TabView = "tasks" | "team" | "admin";

export default function Tarefas() {
  const { toast } = useToast();
  const { authReady, session, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterRecurrence, setFilterRecurrence] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [previousAssignee, setPreviousAssignee] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(emptyFormData);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [tabView, setTabView] = useState<TabView>("tasks");

  // Buscar perfil do usuário atual
  const { profile } = useAuth();

  // Filtros para tarefas do time (admin vê todas)
  const teamFilters = {
    search: searchQuery,
    priority: filterPriority as TaskPriority | "all",
    category: filterCategory,
    assignee: "all" as const,
  };

  // Hook para buscar tarefas do time (todas as tarefas) - para admins nas abas "team" e "admin"
  const { data: teamTasks = [], isLoading: teamLoading, error: teamError } = useTasks(
    isAdmin && (tabView === "team" || tabView === "admin") ? teamFilters : undefined
  );

  // Hook para buscar tarefas do próprio usuário (para todos, incluindo admins)
  const { data: myTasks = [], isLoading: myTasksLoading, error: myTasksError } = useUserTasks(
    profile?.full_name ?? null
  );

  // Seleciona os dados corretos baseado na aba ativa
  const isLoading = tabView === "team" ? teamLoading : myTasksLoading;
  const error = tabView === "team" ? teamError : myTasksError;

  // Função helper para verificar se a tarefa está no período selecionado
  const isInDateRange = (taskDate: string | null, range: string): boolean => {
    if (!taskDate || range === "all") return true;
    
    const date = parseISO(taskDate);
    const today = new Date();
    
    switch (range) {
      case "today":
        return format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
      case "week":
        return isWithinInterval(date, {
          start: startOfWeek(today, { weekStartsOn: 1 }),
          end: endOfWeek(today, { weekStartsOn: 1 }),
        });
      case "month":
        return isWithinInterval(date, {
          start: startOfMonth(today),
          end: endOfMonth(today),
        });
      case "overdue":
        return date < startOfDay(today);
      default:
        return true;
    }
  };

  // Aplica filtros locais
  const tasks = tabView === "team" 
    ? teamTasks.filter(task => {
        if (filterAssignee !== "all" && task.assignee !== filterAssignee) return false;
        if (filterRecurrence !== "all") {
          if (filterRecurrence === "none") {
            if (task.recurrence && task.recurrence !== "none") return false;
          } else if (filterRecurrence === "any") {
            if (!task.recurrence || task.recurrence === "none") return false;
          } else {
            if (task.recurrence !== filterRecurrence) return false;
          }
        }
        if (!isInDateRange(task.due_date, filterDateRange)) return false;
        return true;
      })
    : myTasks.filter(task => {
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterPriority !== "all" && task.priority !== filterPriority) return false;
        if (filterCategory !== "all" && task.category !== filterCategory) return false;
        return true;
      });

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const toggleComplete = useToggleTaskComplete();
  const toggleDoing = useToggleTaskDoing();

  // Buscar usuarios reais do banco
  const { data: users = [] } = useQuery({
    queryKey: ["profiles-for-tasks"],
    queryFn: async () => {
      console.log("🔥 loadData disparado Tarefas(users)", session?.user?.id);
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

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const handleToggleComplete = async (id: string, currentCompleted: boolean) => {
    try {
      await toggleComplete.mutateAsync({ id, completed: !currentCompleted });
    } catch {
      toast({
        title: "Erro ao atualizar tarefa",
        variant: "destructive",
      });
    }
  };

  const handleToggleDoing = async (id: string, isDoing: boolean) => {
    try {
      await toggleDoing.mutateAsync({ id, isDoing });
      toast({
        title: isDoing ? "Tarefa iniciada" : "Tarefa pausada",
        description: isDoing ? "Agora todos podem ver que você está trabalhando nela" : "Tarefa marcada como não sendo executada no momento",
      });
    } catch {
      toast({
        title: "Erro ao atualizar status",
        variant: "destructive",
      });
    }
  };

  const handleChangePriority = async (id: string, newPriority: TaskPriority) => {
    try {
      await updateTask.mutateAsync({
        id,
        updates: { priority: newPriority },
      });
      toast({ title: "Prioridade atualizada" });
    } catch {
      toast({
        title: "Erro ao atualizar prioridade",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id);
      toast({ title: "Tarefa excluida" });
    } catch {
      toast({
        title: "Erro ao excluir tarefa",
        variant: "destructive",
      });
    }
  };

  const handleEditTask = (task: TaskWithSubtasks) => {
    setEditingTaskId(task.id);
    setPreviousAssignee(task.assignee || null);
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
    setIsDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Titulo obrigatorio",
        description: "Digite um titulo para a tarefa",
        variant: "destructive",
      });
      return;
    }

    if (!formData.assignee) {
      toast({
        title: "Responsavel obrigatorio",
        description: "Selecione um responsavel para a tarefa",
        variant: "destructive",
      });
      return;
    }

    if (!formData.dueDate) {
      toast({
        title: "Data obrigatoria",
        description: "Selecione uma data de entrega",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTaskId) {
        await updateTask.mutateAsync({
          id: editingTaskId,
          updates: {
            title: formData.title,
            description: formData.description || null,
            priority: formData.priority,
            category: formData.category || null,
            assignee: formData.assignee,
            due_date: formData.dueDate,
            due_time: formData.dueTime || null,
            recurrence: formData.recurrence,
            recurrence_end_date: formData.recurrenceEndDate || null,
          },
          previousAssignee,
          taskTitle: formData.title,
        });
        toast({ title: "Tarefa atualizada" });
      } else {
        await createTask.mutateAsync({
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          category: formData.category || null,
          assignee: formData.assignee,
          due_date: formData.dueDate,
          due_time: formData.dueTime || null,
          completed: false,
          position: 0,
          recurrence: formData.recurrence !== "none" ? formData.recurrence : null,
          recurrence_end_date: formData.recurrenceEndDate || null,
        });
        toast({ title: "Tarefa criada" });
      }
      handleCloseDialog();
    } catch {
      toast({
        title: editingTaskId ? "Erro ao atualizar tarefa" : "Erro ao criar tarefa",
        variant: "destructive",
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTaskId(null);
    setPreviousAssignee(null);
    setFormData(emptyFormData);
  };

  const handleOpenDetail = (id: string) => {
    setSelectedTaskId(id);
    setIsDetailOpen(true);
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

  const overdueCount = tasks.filter(
    (t) => isOverdue(t.due_date, t.completed)
  ).length;
  const highPriorityCount = pendingTasks.filter(
    (t) => t.priority === "alta"
  ).length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-destructive">
        <p>Erro ao carregar tarefas</p>
        <p className="text-sm text-muted-foreground mt-2">
          Verifique se as tabelas foram criadas no Supabase
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground">
            {tabView === "team" ? "Todas as tarefas da equipe" : "Suas tarefas atribuídas"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Toggle (for admins: Minhas Tarefas / Tarefas do Time / Por Equipe) */}
          {isAdmin && (
            <div className="flex rounded-lg border border-border p-1">
              <Button
                variant={tabView === "tasks" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTabView("tasks")}
                className="h-8 px-3 gap-1.5"
              >
                <ListTodo className="h-4 w-4" />
                <span className="hidden sm:inline">Minhas</span>
              </Button>
              <Button
                variant={tabView === "team" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  setTabView("team");
                  setViewMode("by-person");
                }}
                className="h-8 px-3 gap-1.5"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Time</span>
              </Button>
              <Button
                variant={tabView === "admin" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTabView("admin")}
                className="h-8 px-3 gap-1.5"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Por Usuário</span>
              </Button>
            </div>
          )}

          {/* View Mode Toggle */}
          {(tabView === "tasks" || tabView === "team") && (
            <div className="flex rounded-lg border border-border p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 px-3"
                title="Lista"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              {tabView === "team" && (
                <Button
                  variant={viewMode === "by-person" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("by-person")}
                  className="h-8 px-3"
                  title="Por pessoa"
                >
                  <Users className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("kanban")}
                className="h-8 px-3"
                title="Kanban"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Tarefa
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingTaskId ? "Editar Tarefa" : "Nova Tarefa"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titulo *</Label>
                  <Input
                    id="title"
                    placeholder="Digite o titulo da tarefa"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descricao</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva a tarefa..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    maxLength={500}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: TaskPriority) =>
                        setFormData((prev) => ({ ...prev, priority: value }))
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
                    <Label>Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Responsavel *</Label>
                    <Select
                      value={formData.assignee}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, assignee: value }))
                      }
                    >
                      <SelectTrigger className={!formData.assignee ? "border-destructive" : ""}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.full_name}>
                            {user.display_name || user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Data de entrega *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                      className={!formData.dueDate ? "border-destructive" : ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Recorrencia</Label>
                    <Select
                      value={formData.recurrence}
                      onValueChange={(value: RecurrenceType) =>
                        setFormData((prev) => ({ ...prev, recurrence: value }))
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

                  {formData.recurrence !== "none" && (
                    <div className="space-y-2">
                      <Label htmlFor="recurrenceEndDate">Data limite</Label>
                      <Input
                        id="recurrenceEndDate"
                        type="date"
                        placeholder="Opcional"
                        value={formData.recurrenceEndDate}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            recurrenceEndDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveTask}
                    disabled={createTask.isPending || updateTask.isPending}
                  >
                    {editingTaskId ? "Salvar" : "Criar Tarefa"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Admin Panel View */}
      {isAdmin && tabView === "admin" ? (
        <AdminTasksPanel tasks={teamTasks} users={users} isLoading={teamLoading} />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefas..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[140px]">
                  <Flag className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro por responsável - apenas na aba Time */}
              {tabView === "team" && (
                <>
                  <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                    <SelectTrigger className="w-[180px]">
                      <User className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.full_name}>
                          {user.display_name || user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterRecurrence} onValueChange={setFilterRecurrence}>
                    <SelectTrigger className="w-[160px]">
                      <Repeat className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Recorrência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="any">Com recorrência</SelectItem>
                      <SelectItem value="none">Sem recorrência</SelectItem>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quinzenal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="semiannual">Semestral</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                    <SelectTrigger className="w-[160px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as datas</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="week">Esta semana</SelectItem>
                      <SelectItem value="month">Este mês</SelectItem>
                      <SelectItem value="overdue">Atrasadas</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Circle className="h-4 w-4" />
                <span className="text-sm">Pendentes</span>
              </div>
              <p className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-8" /> : pendingTasks.length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Concluidas</span>
              </div>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Skeleton className="h-8 w-8" />
                ) : (
                  completedTasks.length
                )}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Atrasadas</span>
              </div>
              <p className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-8" /> : overdueCount}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Flag className="h-4 w-4 text-destructive" />
                <span className="text-sm">Alta prioridade</span>
              </div>
              <p className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-8" /> : highPriorityCount}
              </p>
            </div>
          </div>

          {/* Content based on view mode */}
          {viewMode === "kanban" ? (
            <TaskKanban
              tasks={tasks}
              onToggleComplete={handleToggleComplete}
              onChangePriority={handleChangePriority}
              isLoading={isLoading}
            />
          ) : viewMode === "by-person" && tabView === "team" ? (
            <TasksByPersonView
              tasks={tasks}
              users={users}
              isLoading={isLoading}
              onToggleComplete={handleToggleComplete}
              onViewDetail={handleOpenDetail}
              onToggleDoing={handleToggleDoing}
            />
          ) : (
            <div className="space-y-6">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Pending Tasks */}
                  {pendingTasks.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-lg font-semibold">Pendentes</h2>
                      <div className="space-y-2">
                        {pendingTasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onToggle={handleToggleComplete}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onViewDetail={handleOpenDetail}
                            getPriorityColor={getPriorityColor}
                            formatDate={formatDate}
                            isOverdue={isOverdue}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Tasks */}
                  {completedTasks.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-lg font-semibold text-muted-foreground">
                        Concluidas
                      </h2>
                      <div className="space-y-2">
                        {completedTasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onToggle={handleToggleComplete}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onViewDetail={handleOpenDetail}
                            getPriorityColor={getPriorityColor}
                            formatDate={formatDate}
                            isOverdue={isOverdue}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {tasks.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Nenhuma tarefa encontrada</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        taskId={selectedTaskId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}

interface TaskItemProps {
  task: TaskWithSubtasks;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (task: TaskWithSubtasks) => void;
  onDelete: (id: string) => void;
  onViewDetail: (id: string) => void;
  getPriorityColor: (priority: string) => string;
  formatDate: (date: string | null) => string;
  isOverdue: (date: string | null, completed: boolean) => boolean;
}

function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  onViewDetail,
  getPriorityColor,
  formatDate,
  isOverdue,
}: TaskItemProps) {
  const subtaskCount = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const subtaskProgress = subtaskCount > 0 ? (completedSubtasks / subtaskCount) * 100 : 0;

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border border-border bg-card transition-all hover:shadow-sm",
        task.completed && "opacity-60"
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id, task.completed)}
        className="mt-1"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Link
                to={`/tarefas/${task.id}`}
                className={cn(
                  "font-medium hover:text-accent transition-colors group inline-flex items-center gap-1",
                  task.completed && "line-through text-muted-foreground"
                )}
              >
                {task.title}
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {task.description}
              </p>
            )}

            {/* Subtasks Preview */}
            {subtaskCount > 0 && (
              <div className="mt-2 p-2 rounded-md bg-muted/50">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <ListTodo className="h-3 w-3" />
                    Subtarefas
                  </span>
                  <span className="font-medium">
                    {completedSubtasks}/{subtaskCount}
                  </span>
                </div>
                <Progress value={subtaskProgress} className="h-1.5 mb-2" />
                <div className="space-y-1">
                  {task.subtasks.slice(0, 3).map((subtask) => (
                    <div
                      key={subtask.id}
                      className={cn(
                        "text-xs flex items-center gap-1.5",
                        subtask.completed && "line-through text-muted-foreground/60"
                      )}
                    >
                      <div
                        className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          subtask.completed ? "bg-success" : "bg-muted-foreground"
                        )}
                      />
                      <span className="truncate">{subtask.title}</span>
                    </div>
                  ))}
                  {subtaskCount > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{subtaskCount - 3} mais
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/tarefas/${task.id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir pagina
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewDetail(task.id)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(task.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Badge variant="outline" className={getPriorityColor(task.priority)}>
            {task.priority === "alta"
              ? "Alta"
              : task.priority === "media"
                ? "Media"
                : "Baixa"}
          </Badge>

          {task.category && <Badge variant="secondary">{task.category}</Badge>}

          {task.assignee && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              {task.assignee}
            </div>
          )}

          {task.due_date && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm",
                isOverdue(task.due_date, task.completed)
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.due_date)}
            </div>
          )}

          {task.recurrence && task.recurrence !== "none" && (
            <div className="flex items-center gap-1 text-sm text-accent">
              <Repeat className="h-3 w-3" />
              {RECURRENCE_LABELS[task.recurrence as RecurrenceType]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
