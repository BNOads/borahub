import { useState, useMemo, useEffect } from "react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  User,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  EyeOff,
  Download,
  Loader2,
  Play,
  Pause,
  Trash2,
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
}

export function TasksByPersonView({
  tasks,
  users,
  isLoading,
  onToggleComplete,
  onViewDetail,
  onToggleDoing,
  onDeleteTask,
}: TasksByPersonViewProps) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null);
  const { toast } = useToast();

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

    // Função para obter prioridade de ordenação por data
    const getDateSortPriority = (task: Task): number => {
      if (!task.due_date) return 4; // Sem data = última prioridade
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(task.due_date + "T00:00:00");
      
      if (dueDate < today) return 1; // Atrasada
      if (dueDate.getTime() === today.getTime()) return 2; // Hoje
      return 3; // Futura
    };

    // Ordena tarefas dentro de cada grupo por data
    Object.keys(grouped).forEach((assignee) => {
      grouped[assignee].sort((a, b) => {
        const priorityA = getDateSortPriority(a);
        const priorityB = getDateSortPriority(b);
        
        // Primeiro ordena por prioridade (atrasadas > hoje > futuras > sem data)
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // Dentro da mesma prioridade, ordena por data
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        
        return 0;
      });
    });

    // Ordena por nome
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

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

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null;
    return (
      <Badge variant="outline" className="text-xs">
        {category}
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
      pdf.text(`Exibindo: ${showCompleted ? "Todas as tarefas" : "Apenas pendentes"}`, margin, yPosition);
      yPosition += 10;

      // Para cada pessoa
      tasksByPerson.forEach(([personName, personTasks]) => {
        const filteredTasks = showCompleted 
          ? personTasks 
          : personTasks.filter(t => !t.completed);
        
        if (!showCompleted && filteredTasks.length === 0) return;

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

  return (
    <div className="space-y-4">
      {/* Botões de ação */}
      <div className="flex justify-end gap-2">
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

      {tasksByPerson.map(([personName, personTasks]) => {
        const userProfile = getUserProfile(personName);
        const isExpanded = expandedUsers.has(personName);
        
        // Filtra tarefas baseado no showCompleted
        const filteredTasks = showCompleted 
          ? personTasks 
          : personTasks.filter(t => !t.completed);
        
        const pendingCount = personTasks.filter((t) => !t.completed).length;
        const completedCount = personTasks.filter((t) => t.completed).length;
        const overdueCount = personTasks.filter(
          (t) => isOverdue(t.due_date ?? null, t.completed)
        ).length;

        // Não exibe usuário se não tiver tarefas pendentes e showCompleted = false
        if (!showCompleted && filteredTasks.length === 0) return null;

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

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{personName}</h3>
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
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Tarefa</TableHead>
                        <TableHead className="w-[100px]">Prioridade</TableHead>
                        <TableHead className="w-[140px]">Categoria</TableHead>
                        <TableHead className="w-[100px]">Prazo</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        {onDeleteTask && <TableHead className="w-12"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => {
                        const overdue = isOverdue(task.due_date ?? null, task.completed);
                        const isDoing = !!task.doing_since;
                        return (
                          <TableRow
                            key={task.id}
                            className={`cursor-pointer transition-all ${
                              isDoing 
                                ? "bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary" 
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() => onViewDetail(task.id)}
                          >
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
                              <div className="flex items-center gap-2">
                                {isDoing && (
                                  <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                                  </span>
                                )}
                                <span
                                  className={`truncate ${
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
                                  <Badge variant="secondary" className="text-[10px] px-1.5">
                                    🔁
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                            <TableCell>{getCategoryBadge(task.category)}</TableCell>
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
    </div>
  );
}
