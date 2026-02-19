import { useState, useMemo, useEffect } from "react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { isToday as isTodayUtil } from "@/lib/dateUtils";
import { ptBR } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  User,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock,
  Eye,
  EyeOff,
  Download,
  Loader2,
  Play,
  Pause,
  Trash2,
  Edit3,
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BulkEditModal } from "./BulkEditModal";
import { useBulkDeleteTasks } from "@/hooks/useTasks";
import jsPDF from "jspdf";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  category: string | null;
  assignee: string;
  due_date?: string | null;
  completed: boolean;
  completed_at?: string | null;
  recurrence?: string | null;
  doing_since?: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface TasksByPersonViewProps {
  tasks: Task[];
  users: UserProfile[];
  isLoading: boolean;
  onToggleComplete: (id: string, currentCompleted: boolean) => void;
  onViewDetail: (id: string) => void;
  onToggleDoing?: (id: string, isDoing: boolean) => void;
  onDeleteTask?: (id: string) => Promise<void>;
  onAddTaskForPerson?: (personName: string) => void;
  activeDateFilter?: string;
}

export function TasksByPersonView({
  tasks,
  users,
  isLoading,
  onToggleComplete,
  onViewDetail,
  onToggleDoing,
  onDeleteTask,
  onAddTaskForPerson,
  activeDateFilter,
}: TasksByPersonViewProps) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null);
  
  // Estado para seleção múltipla
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  
  // Estado para popup de pessoa
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  
  // Estado para ordenação de colunas
  type SortColumn = "title" | "priority" | "due_date" | "status";
  type SortDirection = "asc" | "desc";
  const [sortColumn, setSortColumn] = useState<SortColumn>("due_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  const bulkDelete = useBulkDeleteTasks();
  
  const { toast } = useToast();

  // Helper: verifica se uma tarefa foi concluída hoje (usa utilitário centralizado)
  const wasCompletedToday = (task: Task): boolean => isTodayUtil(task.completed_at);

  // Helper: verifica se uma tarefa deve ser visível baseado no estado de filtros
  const hasActiveDateFilter = activeDateFilter && activeDateFilter !== "all";
  const shouldShowTask = (task: Task) => {
    if (!task.completed) return true; // Pendentes sempre visíveis
    // Concluídas: respeita o botão ocultar sempre
    // Se o botão está em "ocultar" (showCompleted=false), esconde todas concluídas
    if (!showCompleted) return false;
    // Se filtro de data ativo + concluída hoje: sempre mostra
    if (hasActiveDateFilter && wasCompletedToday(task)) return true;
    // Fora de filtro ativo, mostra se showCompleted=true
    return showCompleted;
  };

  // Função para alternar ordenação de coluna
  const handleSortColumn = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Renderiza ícone de ordenação
  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3.5 w-3.5 ml-1" /> 
      : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
  };

  // Função de ordenação de tarefas
  const sortTasks = (tasksToSort: Task[]): Task[] => {
    const priorityOrder: Record<string, number> = { alta: 1, media: 2, baixa: 3 };
    
    return [...tasksToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "priority":
          comparison = (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
          break;
        case "due_date":
          if (!a.due_date && !b.due_date) comparison = 0;
          else if (!a.due_date) comparison = 1;
          else if (!b.due_date) comparison = -1;
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case "status":
          // Order: fazendo > atrasada > pendente > concluída
          const getStatusOrder = (task: Task) => {
            if (task.doing_since) return 1;
            if (!task.completed && task.due_date) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (new Date(task.due_date + "T00:00:00") < today) return 2;
            }
            if (!task.completed) return 3;
            return 4;
          };
          comparison = getStatusOrder(a) - getStatusOrder(b);
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  };

  // Agrupa tarefas por responsável (assignee = full_name)
  const tasksByPerson = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    tasks.forEach((task) => {
      const assignee = task.assignee || "Sem responsável";
      if (!grouped[assignee]) {
        grouped[assignee] = [];
      }
      grouped[assignee].push(task);
    });

    // Ordena tarefas dentro de cada grupo usando a função de ordenação
    Object.keys(grouped).forEach((assignee) => {
      grouped[assignee] = sortTasks(grouped[assignee]);
    });

    // Ordena por nome
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [tasks, sortColumn, sortDirection]);

  // Expande todos por padrão quando os dados carregam
  useEffect(() => {
    if (tasksByPerson.length > 0 && expandedUsers.size === 0) {
      setExpandedUsers(new Set(tasksByPerson.map(([name]) => name)));
    }
  }, [tasksByPerson]);

  // Encontra o perfil do usuário pelo nome
  const getUserProfile = (name: string): UserProfile | undefined => {
    return users.find(
      (u) => u.full_name === name || u.display_name === name
    );
  };

  const toggleExpanded = (name: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      alta: "bg-destructive hover:bg-destructive/90",
      media: "bg-amber-500 hover:bg-amber-600",
      baixa: "bg-emerald-500 hover:bg-emerald-600",
    };
    return (
      <Badge
        className={`${colors[priority] || "bg-muted"} text-white text-xs`}
      >
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };


  const formatDate = (date: string | null) => {
    if (!date) return "-";
    try {
      return format(parseISO(date), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const isOverdue = (date: string | null, completed: boolean) => {
    if (!date || completed) return false;
    const dueDate = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const handleDeleteClick = (task: { id: string; title: string }) => {
    setTaskToDelete(task);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete || !onDeleteTask) return;
    try {
      await onDeleteTask(taskToDelete.id);
      toast({
        title: "Tarefa excluída",
        description: "A tarefa foi removida com sucesso.",
      });
    } catch {
      toast({
        title: "Erro ao excluir tarefa",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
    }
  };

  // Gera PDF com os dados atuais
  const generatePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Título
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("Relatório de Tarefas por Pessoa", margin, yPosition);
      yPosition += 8;

      // Data
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, yPosition);
      yPosition += 4;
      const filterLabel = hasActiveDateFilter 
        ? "Tarefas do período filtrado" 
        : showCompleted ? "Todas as tarefas" : "Apenas pendentes";
      pdf.text(`Exibindo: ${filterLabel}`, margin, yPosition);
      yPosition += 10;

      // Para cada pessoa
      tasksByPerson.forEach(([personName, personTasks]) => {
        const filteredTasks = personTasks.filter(shouldShowTask);
        
        if (filteredTasks.length === 0) return;

        // Verifica se precisa nova página
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }

        // Nome da pessoa
        const pendingCount = personTasks.filter(t => !t.completed).length;
        const completedCount = personTasks.filter(t => t.completed).length;
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, yPosition - 4, pageWidth - margin * 2, 8, "F");
        pdf.text(`${personName} (${pendingCount} pendentes, ${completedCount} concluídas)`, margin + 2, yPosition);
        yPosition += 10;

        // Cabeçalho da tabela
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("Tarefa", margin, yPosition);
        pdf.text("Prioridade", pageWidth - 80, yPosition);
        pdf.text("Prazo", pageWidth - 45, yPosition);
        pdf.text("Status", pageWidth - 25, yPosition);
        yPosition += 5;

        // Linha separadora
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);

        // Tarefas
        pdf.setFont("helvetica", "normal");
        filteredTasks.forEach((task) => {
          if (yPosition > pageHeight - 15) {
            pdf.addPage();
            yPosition = margin;
          }

          const overdue = isOverdue(task.due_date ?? null, task.completed);
          
          // Título truncado
          const maxTitleWidth = pageWidth - 100;
          let title = task.title;
          while (pdf.getTextWidth(title) > maxTitleWidth && title.length > 3) {
            title = title.slice(0, -4) + "...";
          }
          
          pdf.text(title, margin, yPosition);
          pdf.text(task.priority.charAt(0).toUpperCase() + task.priority.slice(1), pageWidth - 80, yPosition);
          pdf.text(task.due_date ? format(parseISO(task.due_date), "dd/MM/yy") : "-", pageWidth - 45, yPosition);
          
          const isDoing = !!task.doing_since;
          let status = task.completed ? "Concluída" : isDoing ? "Fazendo" : overdue ? "Atrasada" : "Pendente";
          pdf.text(status, pageWidth - 25, yPosition);
          
          yPosition += 5;
        });

        yPosition += 5;
      });

      // Download
      pdf.save(`tarefas-por-pessoa-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({
        title: "PDF gerado com sucesso!",
        description: "O download foi iniciado automaticamente.",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (tasksByPerson.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhuma tarefa encontrada</p>
      </div>
    );
  }

  // Toggle seleção de tarefa
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Selecionar todas as tarefas visíveis
  const selectAllVisible = () => {
    const visibleTaskIds = tasksByPerson.flatMap(([, personTasks]) => {
      return personTasks.filter(shouldShowTask).map(t => t.id);
    });
    setSelectedTasks(new Set(visibleTaskIds));
  };

  // Selecionar todas as tarefas de uma pessoa
  const toggleSelectPersonTasks = (personName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita abrir/fechar o collapsible
    
    const personTasksList = tasksByPerson.find(([name]) => name === personName)?.[1] || [];
    const filteredTasks = personTasksList.filter(shouldShowTask);
    const personTaskIds = filteredTasks.map(t => t.id);
    
    // Verifica se todas já estão selecionadas
    const allSelected = personTaskIds.every(id => selectedTasks.has(id));
    
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (allSelected) {
        // Remove todas da pessoa
        personTaskIds.forEach(id => next.delete(id));
      } else {
        // Adiciona todas da pessoa
        personTaskIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Verifica se todas as tarefas de uma pessoa estão selecionadas
  const areAllPersonTasksSelected = (personName: string): boolean => {
    const personTasksList = tasksByPerson.find(([name]) => name === personName)?.[1] || [];
    const filteredTasks = personTasksList.filter(shouldShowTask);
    if (filteredTasks.length === 0) return false;
    return filteredTasks.every(t => selectedTasks.has(t.id));
  };

  // Verifica se algumas tarefas de uma pessoa estão selecionadas
  const areSomePersonTasksSelected = (personName: string): boolean => {
    const personTasksList = tasksByPerson.find(([name]) => name === personName)?.[1] || [];
    const filteredTasks = personTasksList.filter(shouldShowTask);
    const selectedCount = filteredTasks.filter(t => selectedTasks.has(t.id)).length;
    return selectedCount > 0 && selectedCount < filteredTasks.length;
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedTasks(new Set());
    setSelectionMode(false);
  };

  return (
    <div className="space-y-4">
      {/* Botões de ação */}
      <div className="flex justify-between gap-2">
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllVisible}
                className="gap-2"
              >
                Selecionar tudo
              </Button>
              {selectedTasks.size > 0 && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setBulkEditOpen(true)}
                    className="gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar {selectedTasks.size}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setBulkDeleteConfirmOpen(true)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir {selectedTasks.size}
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode(true)}
              className="gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Editar em massa
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generatePdf}
            disabled={isGeneratingPdf}
            className="gap-2"
          >
            {isGeneratingPdf ? (
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className="gap-2"
          >
            {showCompleted ? (
              <>
                <EyeOff className="h-4 w-4" />
                Ocultar concluídas
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Mostrar concluídas
              </>
            )}
          </Button>
        </div>
      </div>

      {tasksByPerson.map(([personName, personTasks]) => {
        const userProfile = getUserProfile(personName);
        const isExpanded = expandedUsers.has(personName);
        
        // Usa a função helper global shouldShowTask
        const filteredTasks = personTasks.filter(shouldShowTask);
        
        const pendingCount = personTasks.filter((t) => !t.completed).length;
        const completedCount = personTasks.filter((t) => t.completed).length;
        const completedTodayCount = personTasks.filter((t) => t.completed && wasCompletedToday(t)).length;
        const hiddenCompletedCount = completedCount - completedTodayCount; // Concluídas que não são de hoje
        const overdueCount = personTasks.filter(
          (t) => isOverdue(t.due_date ?? null, t.completed)
        ).length;

        // Não exibe usuário se não tiver tarefas visíveis
        if (filteredTasks.length === 0) return null;

        return (
          <Collapsible
            key={personName}
            open={isExpanded}
            onOpenChange={() => toggleExpanded(personName)}
          >
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="text-muted-foreground">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </div>

                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {personName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <h3 
                      className="font-semibold truncate cursor-pointer hover:text-primary hover:underline transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPerson(personName);
                      }}
                    >
                      {personName}
                    </h3>
                    
                    {/* Botão para adicionar nova tarefa para a pessoa */}
                    {onAddTaskForPerson && !selectionMode && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddTaskForPerson(personName);
                              }}
                              className="p-1.5 rounded-full transition-colors bg-accent text-accent-foreground hover:bg-accent/80 shadow-sm"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Nova tarefa para {personName}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {/* Ícone para selecionar todas as tarefas da pessoa */}
                    {selectionMode && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => toggleSelectPersonTasks(personName, e)}
                              className={`p-1 rounded-md transition-colors hover:bg-primary/20 ${
                                areAllPersonTasksSelected(personName)
                                  ? "text-primary"
                                  : areSomePersonTasksSelected(personName)
                                    ? "text-primary/60"
                                    : "text-muted-foreground"
                              }`}
                            >
                              <CheckSquare className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {areAllPersonTasksSelected(personName) 
                              ? "Desmarcar todas" 
                              : "Selecionar todas"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? "s" : ""}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Circle className="h-3.5 w-3.5" />
                        <span>{pendingCount}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{completedCount}</span>
                      </div>
                      {overdueCount > 0 && (
                        <div className="flex items-center gap-1 text-destructive">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{overdueCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        {selectionMode && <TableHead className="w-10"></TableHead>}
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="w-12"></TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                          onClick={() => handleSortColumn("title")}
                        >
                          <div className="flex items-center">
                            Tarefa
                            <SortIcon column="title" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-[100px] cursor-pointer hover:bg-muted/50 transition-colors select-none"
                          onClick={() => handleSortColumn("priority")}
                        >
                          <div className="flex items-center">
                            Prioridade
                            <SortIcon column="priority" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-[100px] cursor-pointer hover:bg-muted/50 transition-colors select-none"
                          onClick={() => handleSortColumn("due_date")}
                        >
                          <div className="flex items-center">
                            Prazo
                            <SortIcon column="due_date" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-[100px] cursor-pointer hover:bg-muted/50 transition-colors select-none"
                          onClick={() => handleSortColumn("status")}
                        >
                          <div className="flex items-center">
                            Status
                            <SortIcon column="status" />
                          </div>
                        </TableHead>
                        {onDeleteTask && <TableHead className="w-12"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => {
                        const overdue = isOverdue(task.due_date ?? null, task.completed);
                        const isDoing = !!task.doing_since;
                        const isSelected = selectedTasks.has(task.id);
                        return (
                          <TableRow
                            key={task.id}
                            className={`cursor-pointer transition-all ${
                              isSelected 
                                ? "bg-primary/20 hover:bg-primary/25" 
                                : isDoing 
                                  ? "bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary" 
                                  : "hover:bg-muted/50"
                            }`}
                            onClick={() => selectionMode ? toggleTaskSelection(task.id) : onViewDetail(task.id)}
                          >
                            {selectionMode && (
                              <TableCell
                                onClick={(e) => e.stopPropagation()}
                                className="text-center"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleTaskSelection(task.id)}
                                />
                              </TableCell>
                            )}
                            <TableCell
                              onClick={(e) => e.stopPropagation()}
                              className="text-center"
                            >
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() =>
                                  onToggleComplete(task.id, task.completed)
                                }
                              />
                            </TableCell>
                            <TableCell
                              onClick={(e) => e.stopPropagation()}
                              className="text-center px-1"
                            >
                              {!task.completed && onToggleDoing && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant={isDoing ? "default" : "ghost"}
                                        size="icon"
                                        className={`h-7 w-7 ${isDoing ? "bg-primary text-primary-foreground" : ""}`}
                                        onClick={() => onToggleDoing(task.id, !isDoing)}
                                      >
                                        {isDoing ? (
                                          <Pause className="h-3.5 w-3.5" />
                                        ) : (
                                          <Play className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {isDoing ? (
                                        <span>
                                          Fazendo há {formatDistanceToNow(new Date(task.doing_since!), { locale: ptBR })}
                                          <br />Clique para pausar
                                        </span>
                                      ) : (
                                        "Iniciar tarefa"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-start gap-2">
                                {isDoing && (
                                  <span className="relative flex h-2.5 w-2.5 mt-1 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                                  </span>
                                )}
                                <span
                                  className={`break-words ${
                                    task.completed
                                      ? "line-through text-muted-foreground"
                                      : isDoing
                                        ? "font-medium text-primary"
                                        : ""
                                  }`}
                                >
                                  {task.title}
                                </span>
                                {task.recurrence && task.recurrence !== "none" && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                                    🔁
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                            <TableCell>
                              <span
                                className={
                                  overdue ? "text-destructive font-medium" : ""
                                }
                              >
                                {formatDate(task.due_date ?? null)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {task.completed ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                >
                                  Concluída
                                </Badge>
                              ) : isDoing ? (
                                <Badge className="bg-primary/90 hover:bg-primary text-primary-foreground animate-pulse">
                                  Fazendo
                                </Badge>
                              ) : overdue ? (
                                <Badge variant="destructive">Atrasada</Badge>
                              ) : (
                                <Badge variant="outline">Pendente</Badge>
                              )}
                            </TableCell>
                            {onDeleteTask && (
                              <TableCell
                                onClick={(e) => e.stopPropagation()}
                                className="text-center"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteClick({ id: task.id, title: task.title })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  {/* Link para ver tarefas concluídas ocultas (exclui as de hoje que já aparecem) */}
                  {!showCompleted && !hasActiveDateFilter && hiddenCompletedCount > 0 && (
                    <div className="border-t border-border">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCompleted(true);
                        }}
                        className="w-full py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        + {hiddenCompletedCount} tarefa{hiddenCompletedCount > 1 ? 's' : ''} concluída{hiddenCompletedCount > 1 ? 's' : ''} anterior{hiddenCompletedCount > 1 ? 'es' : ''}
                      </button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tarefa "{taskToDelete?.title}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Edit Modal */}
      <BulkEditModal
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedTaskIds={Array.from(selectedTasks)}
        onSuccess={clearSelection}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedTasks.size} tarefa{selectedTasks.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedTasks.size} tarefa{selectedTasks.size > 1 ? "s" : ""} selecionada{selectedTasks.size > 1 ? "s" : ""}? 
              Esta ação não pode ser desfeita e também removerá todas as subtarefas associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await bulkDelete.mutateAsync(Array.from(selectedTasks));
                  toast({
                    title: `${selectedTasks.size} tarefa${selectedTasks.size > 1 ? "s" : ""} excluída${selectedTasks.size > 1 ? "s" : ""}`,
                  });
                  clearSelection();
                } catch (error) {
                  console.error("Erro ao excluir tarefas:", error);
                  toast({
                    title: "Erro ao excluir tarefas",
                    description: "Tente novamente",
                    variant: "destructive",
                  });
                }
                setBulkDeleteConfirmOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDelete.isPending}
            >
              {bulkDelete.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Person Tasks Popup */}
      <Dialog open={!!selectedPerson} onOpenChange={(open) => !open && setSelectedPerson(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedPerson && (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getUserProfile(selectedPerson)?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedPerson.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  Tarefas de {selectedPerson}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPerson && (
            <div className="flex-1 overflow-auto -mx-6 px-6">
              {(() => {
                const personTasks = tasks.filter(t => t.assignee === selectedPerson);
                const pendingTasks = personTasks.filter(t => !t.completed);
                const completedTasks = personTasks.filter(t => t.completed);
                
                return (
                  <div className="space-y-4 pb-4">
                    {/* Resumo */}
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Circle className="h-3.5 w-3.5" />
                        <span>{pendingTasks.length} pendente{pendingTasks.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{completedTasks.length} concluída{completedTasks.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    {/* Tarefas pendentes */}
                    {pendingTasks.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">Pendentes</h4>
                        <div className="space-y-1">
                          {sortTasks(pendingTasks).map(task => {
                            const overdue = isOverdue(task.due_date ?? null, task.completed);
                            const isDoing = !!task.doing_since;
                            return (
                              <div 
                                key={task.id}
                                className={`p-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors ${
                                  isDoing ? 'border-l-4 border-l-primary bg-primary/5' : ''
                                }`}
                                onClick={() => {
                                  setSelectedPerson(null);
                                  onViewDetail(task.id);
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 min-w-0">
                                    {isDoing && (
                                      <span className="relative flex h-2.5 w-2.5 mt-1.5 shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                                      </span>
                                    )}
                                    <span className={`break-words ${isDoing ? 'font-medium text-primary' : ''}`}>
                                      {task.title}
                                    </span>
                                    {task.recurrence && task.recurrence !== "none" && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">🔁</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {getPriorityBadge(task.priority)}
                                    {isDoing ? (
                                      <Badge className="bg-primary/90 text-primary-foreground text-[10px]">Fazendo</Badge>
                                    ) : overdue ? (
                                      <Badge variant="destructive" className="text-[10px]">Atrasada</Badge>
                                    ) : null}
                                  </div>
                                </div>
                                {task.due_date && (
                                  <div className={`text-xs mt-1 ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                    {formatDate(task.due_date)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Tarefas concluídas */}
                    {completedTasks.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">Concluídas</h4>
                        <div className="space-y-1">
                          {sortTasks(completedTasks).map(task => (
                            <div 
                              key={task.id}
                              className="p-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors opacity-70"
                              onClick={() => {
                                setSelectedPerson(null);
                                onViewDetail(task.id);
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                  <span className="break-words line-through text-muted-foreground">
                                    {task.title}
                                  </span>
                                </div>
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] shrink-0">
                                  Concluída
                                </Badge>
                              </div>
                              {task.completed_at && (
                                <div className="text-xs text-muted-foreground mt-1 ml-6">
                                  {format(parseISO(task.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {personTasks.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        Nenhuma tarefa atribuída
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
