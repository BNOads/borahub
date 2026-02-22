import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toLocalDateString, isInDateRange as isInDateRangeUtil, type DateRangeFilter } from "@/lib/dateUtils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Play,
  Pause,
  ListPlus,
  Download,
  Loader2,
  Copy,
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
import { BulkTaskModal } from "@/components/tasks/BulkTaskModal";
import jsPDF from "jspdf";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { RichDescriptionEditor } from "@/components/tasks/RichDescriptionEditor";
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
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  // Filtro de data pessoal (aba Minhas Tarefas)
  const [myDateRange, setMyDateRange] = useState<string>("all");
  const [myCustomDateStart, setMyCustomDateStart] = useState<Date | undefined>(undefined);
  const [myCustomDateEnd, setMyCustomDateEnd] = useState<Date | undefined>(undefined);
  const [myDatePopoverOpen, setMyDatePopoverOpen] = useState(false);
  const [isGeneratingMyPdf, setIsGeneratingMyPdf] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [previousAssignee, setPreviousAssignee] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(emptyFormData);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [tabView, setTabView] = useState<TabView>("tasks");
  const [initialTabSet, setInitialTabSet] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [dupTask, setDupTask] = useState<TaskWithSubtasks | null>(null);
  const [dupAssignee, setDupAssignee] = useState("");
  const [dupDate, setDupDate] = useState("");
  // Buscar perfil do usuário atual
  const { profile } = useAuth();

  // Quando isAdmin ficar disponível, definir a aba inicial como "team" para admins
  useEffect(() => {
    if (!initialTabSet && isAdmin !== undefined) {
      if (isAdmin) {
        setTabView("team");
        setViewMode("by-person");
      }
      setInitialTabSet(true);
    }
  }, [isAdmin, initialTabSet]);

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

  // Função helper para obter a data relevante para filtros de tarefas.
  // Para tarefas concluídas, prioriza completed_at; para pendentes, usa due_date.
  const getRelevantDateForTask = (task: TaskWithSubtasks): string | null => {
    if (task.completed) {
      // Preferimos completed_at (data real de conclusão); se vier nulo/inválido, caímos no due_date.
      return toLocalDateString(task.completed_at) ?? toLocalDateString(task.due_date);
    }
    return toLocalDateString(task.due_date);
  };

  // Wrapper para usar o utilitário centralizado de filtro de data
  const isInDateRange = (taskDate: string | null, range: string): boolean => {
    return isInDateRangeUtil(taskDate, range as DateRangeFilter, customDateStart, customDateEnd);
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
        // Usa data relevante: completed_at para concluídas, due_date para pendentes
        const relevantDate = getRelevantDateForTask(task);
        const inRange = isInDateRange(relevantDate, filterDateRange);

        if (!inRange) return false;
        return true;
      })
    : myTasks.filter(task => {
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterPriority !== "all" && task.priority !== filterPriority) return false;
        if (filterCategory !== "all" && task.category !== filterCategory) return false;
        // Filtro de data pessoal
        const relevantDate = getRelevantDateForTask(task);
        if (!isInDateRangeUtil(relevantDate, myDateRange as DateRangeFilter, myCustomDateStart, myCustomDateEnd)) return false;
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

  const handleDuplicate = async () => {
    if (!dupTask || !dupAssignee || !dupDate) {
      toast({ title: "Preencha responsável e data", variant: "destructive" });
      return;
    }
    try {
      await createTask.mutateAsync({
        title: dupTask.title,
        description: dupTask.description || "",
        priority: dupTask.priority,
        category: dupTask.category || "",
        assignee: dupAssignee,
        due_date: dupDate,
      });
      toast({ title: "Tarefa duplicada com sucesso!" });
      setShowDuplicate(false);
      setDupTask(null);
    } catch {
      toast({ title: "Erro ao duplicar tarefa", variant: "destructive" });
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

  const handleAddTaskForPerson = (personName: string) => {
    setFormData({
      ...emptyFormData,
      assignee: personName,
    });
    setEditingTaskId(null);
    setPreviousAssignee(null);
    setIsDialogOpen(true);
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

  // PDF para "Minhas Tarefas"
  const generateMyTasksPdf = async () => {
    if (!profile) return;
    setIsGeneratingMyPdf(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      const userName = profile.display_name || profile.full_name;

      // Título
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Tarefas de ${userName}`, margin, yPos);
      yPos += 8;

      // Data de geração
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, yPos);
      yPos += 4;

      // Info do filtro
      const dateLabels: Record<string, string> = { all: "Todas as datas", today: "Hoje", week: "Esta semana", month: "Este mês", overdue: "Atrasadas", custom: "Personalizado" };
      pdf.text(`Filtro: ${dateLabels[myDateRange] || "Todas as datas"}`, margin, yPos);
      yPos += 4;
      pdf.text(`Total: ${pendingTasks.length} pendentes, ${completedTasks.length} concluídas`, margin, yPos);
      yPos += 10;

      // Helper para adicionar seção
      const addSection = (title: string, sectionTasks: typeof tasks) => {
        if (sectionTasks.length === 0) return;

        if (yPos > pageHeight - 30) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, yPos - 4, pageWidth - margin * 2, 8, "F");
        pdf.text(`${title} (${sectionTasks.length})`, margin + 2, yPos);
        yPos += 10;

        // Cabeçalho
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("Tarefa", margin, yPos);
        pdf.text("Prioridade", pageWidth - 80, yPos);
        pdf.text("Prazo", pageWidth - 45, yPos);
        pdf.text("Status", pageWidth - 25, yPos);
        yPos += 5;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPos - 2, pageWidth - margin, yPos - 2);

        pdf.setFont("helvetica", "normal");
        sectionTasks.forEach((task) => {
          if (yPos > pageHeight - 15) {
            pdf.addPage();
            yPos = margin;
          }

          const maxTitleWidth = pageWidth - 100;
          let title = task.title;
          while (pdf.getTextWidth(title) > maxTitleWidth && title.length > 3) {
            title = title.slice(0, -4) + "...";
          }

          pdf.text(title, margin, yPos);
          pdf.text(task.priority.charAt(0).toUpperCase() + task.priority.slice(1), pageWidth - 80, yPos);
          pdf.text(task.due_date ? format(parseISO(task.due_date), "dd/MM/yy") : "-", pageWidth - 45, yPos);

          const isDoing = !!(task as any).doing_since;
          const overdue = isOverdue(task.due_date, task.completed);
          const status = task.completed ? "Concluída" : isDoing ? "Fazendo" : overdue ? "Atrasada" : "Pendente";
          pdf.text(status, pageWidth - 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      };

      addSection("Pendentes", pendingTasks);
      addSection("Concluídas", completedTasks);

      // Rodapé
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text("Gerado pelo BORA Hub", margin, pageHeight - 8);
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
      }

      pdf.save(`minhas-tarefas-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ title: "PDF gerado com sucesso!", description: "O download foi iniciado automaticamente." });
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast({ title: "Erro ao gerar PDF", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsGeneratingMyPdf(false);
    }
  };

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

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setIsBulkModalOpen(true)}
              >
                <ListPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Criar em Massa</span>
              </Button>
            )}
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
                  <RichDescriptionEditor
                    value={formData.description}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: val,
                      }))
                    }
                    rows={3}
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
                            <div className="flex items-center gap-2">
                              <img
                                src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&size=24&background=random`}
                                alt=""
                                className="h-5 w-5 rounded-full object-cover shrink-0"
                              />
                              {user.display_name || user.full_name}
                            </div>
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
          </div>
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

                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[180px] justify-start text-left font-normal gap-2",
                          filterDateRange !== "all" && "bg-accent text-accent-foreground border-accent hover:bg-accent/90 hover:text-accent-foreground"
                        )}
                      >
                        <Calendar className="h-4 w-4" />
                        {filterDateRange === "all" && "Todas as datas"}
                        {filterDateRange === "today" && "Hoje"}
                        {filterDateRange === "week" && "Esta semana"}
                        {filterDateRange === "month" && "Este mês"}
                        {filterDateRange === "overdue" && "Atrasadas"}
                        {filterDateRange === "custom" && (
                          customDateStart && customDateEnd 
                            ? `${format(customDateStart, "dd/MM")} - ${format(customDateEnd, "dd/MM")}`
                            : customDateStart 
                              ? `A partir de ${format(customDateStart, "dd/MM")}`
                              : customDateEnd 
                                ? `Até ${format(customDateEnd, "dd/MM")}`
                                : "Personalizado"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-2 space-y-1 border-b">
                        {["all", "today", "week", "month", "overdue"].map((range) => {
                          const labels: Record<string, string> = { all: "Todas as datas", today: "Hoje", week: "Esta semana", month: "Este mês", overdue: "Atrasadas" };
                          return (
                            <Button
                              key={range}
                              variant={filterDateRange === range ? "secondary" : "ghost"}
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                setFilterDateRange(range);
                                setCustomDateStart(undefined);
                                setCustomDateEnd(undefined);
                                setDatePopoverOpen(false);
                              }}
                            >
                              {labels[range]}
                            </Button>
                          );
                        })}
                      </div>
                      <div className="p-3 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Período personalizado</p>
                        <div className="flex gap-2 items-center">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">De</Label>
                            <Input
                              type="date"
                              className="h-8 w-[130px]"
                              value={customDateStart ? format(customDateStart, "yyyy-MM-dd") : ""}
                              onChange={(e) => {
                                const date = e.target.value ? new Date(e.target.value + "T00:00:00") : undefined;
                                setCustomDateStart(date);
                                setFilterDateRange("custom");
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Até</Label>
                            <Input
                              type="date"
                              className="h-8 w-[130px]"
                              value={customDateEnd ? format(customDateEnd, "yyyy-MM-dd") : ""}
                              onChange={(e) => {
                                const date = e.target.value ? new Date(e.target.value + "T00:00:00") : undefined;
                                setCustomDateEnd(date);
                                setFilterDateRange("custom");
                              }}
                            />
                          </div>
                        </div>
                        {filterDateRange === "custom" && (customDateStart || customDateEnd) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setCustomDateStart(undefined);
                              setCustomDateEnd(undefined);
                              setFilterDateRange("all");
                            }}
                          >
                            Limpar período
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </>
              )}

              {/* Filtro de data - aba Minhas Tarefas */}
              {tabView === "tasks" && (
                <Popover open={myDatePopoverOpen} onOpenChange={setMyDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal gap-2",
                        myDateRange !== "all" && "bg-accent text-accent-foreground border-accent hover:bg-accent/90 hover:text-accent-foreground"
                      )}
                    >
                      <Calendar className="h-4 w-4" />
                      {myDateRange === "all" && "Todas as datas"}
                      {myDateRange === "today" && "Hoje"}
                      {myDateRange === "week" && "Esta semana"}
                      {myDateRange === "month" && "Este mês"}
                      {myDateRange === "overdue" && "Atrasadas"}
                      {myDateRange === "custom" && (
                        myCustomDateStart && myCustomDateEnd 
                          ? `${format(myCustomDateStart, "dd/MM")} - ${format(myCustomDateEnd, "dd/MM")}`
                          : myCustomDateStart 
                            ? `A partir de ${format(myCustomDateStart, "dd/MM")}`
                            : myCustomDateEnd 
                              ? `Até ${format(myCustomDateEnd, "dd/MM")}`
                              : "Personalizado"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-2 space-y-1 border-b">
                      {["all", "today", "week", "month", "overdue"].map((range) => {
                        const labels: Record<string, string> = { all: "Todas as datas", today: "Hoje", week: "Esta semana", month: "Este mês", overdue: "Atrasadas" };
                        return (
                          <Button
                            key={range}
                            variant={myDateRange === range ? "secondary" : "ghost"}
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => {
                              setMyDateRange(range);
                              setMyCustomDateStart(undefined);
                              setMyCustomDateEnd(undefined);
                              setMyDatePopoverOpen(false);
                            }}
                          >
                            {labels[range]}
                          </Button>
                        );
                      })}
                    </div>
                    <div className="p-3 space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Período personalizado</p>
                      <div className="flex gap-2 items-center">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">De</Label>
                          <Input
                            type="date"
                            className="h-8 w-[130px]"
                            value={myCustomDateStart ? format(myCustomDateStart, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                              const date = e.target.value ? new Date(e.target.value + "T00:00:00") : undefined;
                              setMyCustomDateStart(date);
                              setMyDateRange("custom");
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Até</Label>
                          <Input
                            type="date"
                            className="h-8 w-[130px]"
                            value={myCustomDateEnd ? format(myCustomDateEnd, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                              const date = e.target.value ? new Date(e.target.value + "T00:00:00") : undefined;
                              setMyCustomDateEnd(date);
                              setMyDateRange("custom");
                            }}
                          />
                        </div>
                      </div>
                      {myDateRange === "custom" && (myCustomDateStart || myCustomDateEnd) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setMyCustomDateStart(undefined);
                            setMyCustomDateEnd(undefined);
                            setMyDateRange("all");
                          }}
                        >
                          Limpar período
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
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
              onDeleteTask={handleDeleteTask}
              onAddTaskForPerson={handleAddTaskForPerson}
              activeDateFilter={filterDateRange}
            />
          ) : (
            <div className="space-y-6">
              {/* Botão PDF para Minhas Tarefas */}
              {tabView === "tasks" && !isLoading && tasks.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateMyTasksPdf}
                    disabled={isGeneratingMyPdf}
                    className="gap-2"
                  >
                    {isGeneratingMyPdf ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Baixar PDF
                      </>
                    )}
                  </Button>
                </div>
              )}

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
                            onToggleDoing={handleToggleDoing}
                            onDuplicate={(t) => { setDupTask(t); setDupAssignee(t.assignee || ""); setDupDate(t.due_date || ""); setShowDuplicate(true); }}
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
                            onToggleDoing={handleToggleDoing}
                            onDuplicate={(t) => { setDupTask(t); setDupAssignee(t.assignee || ""); setDupDate(t.due_date || ""); setShowDuplicate(true); }}
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

      {/* Bulk Task Modal */}
      <BulkTaskModal
        open={isBulkModalOpen}
        onOpenChange={setIsBulkModalOpen}
      />

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
    </div>
  );
}

interface TaskItemProps {
  task: TaskWithSubtasks;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (task: TaskWithSubtasks) => void;
  onDelete: (id: string) => void;
  onViewDetail: (id: string) => void;
  onToggleDoing?: (id: string, isDoing: boolean) => void;
  onDuplicate?: (task: TaskWithSubtasks) => void;
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
  onToggleDoing,
  onDuplicate,
  getPriorityColor,
  formatDate,
  isOverdue,
}: TaskItemProps) {
  const subtaskCount = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const subtaskProgress = subtaskCount > 0 ? (completedSubtasks / subtaskCount) * 100 : 0;
  const isDoing = !!(task as any).doing_since;

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border transition-all hover:shadow-sm",
        isDoing 
          ? "bg-primary/5 border-primary/50 border-l-4 border-l-primary" 
          : task.completed
          ? "border-success/60 bg-success/5"
          : "border-border bg-card",
        task.completed && "opacity-70"
      )}
    >
      <div className="flex items-center gap-2 mt-1">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggle(task.id, task.completed)}
          className={cn(task.completed && "border-success data-[state=checked]:bg-success data-[state=checked]:border-success")}
        />
        {!task.completed && onToggleDoing && (
          <Button
            variant={isDoing ? "default" : "ghost"}
            size="icon"
            className={cn("h-7 w-7", isDoing && "bg-primary text-primary-foreground")}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDoing(task.id, !isDoing);
            }}
            title={isDoing ? "Pausar tarefa" : "Iniciar tarefa"}
          >
            {isDoing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Link
                to={`/tarefas/${task.id}`}
                  className={cn(
                    "font-medium underline hover:text-accent transition-colors group inline-flex items-center gap-1",
                    task.completed && "text-muted-foreground"
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
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(task)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
              )}
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
          {isDoing && (
            <Badge className="bg-primary/90 hover:bg-primary text-primary-foreground animate-pulse gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground"></span>
              </span>
              Fazendo
            </Badge>
          )}
          
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
