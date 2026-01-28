import { useState, useMemo, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
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
}

export function TasksByPersonView({
  tasks,
  users,
  isLoading,
  onToggleComplete,
  onViewDetail,
}: TasksByPersonViewProps) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
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
          
          let status = task.completed ? "Concluída" : overdue ? "Atrasada" : "Pendente";
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
                        <TableHead>Tarefa</TableHead>
                        <TableHead className="w-[100px]">Prioridade</TableHead>
                        <TableHead className="w-[140px]">Categoria</TableHead>
                        <TableHead className="w-[100px]">Prazo</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => {
                        const overdue = isOverdue(task.due_date ?? null, task.completed);
                        return (
                          <TableRow
                            key={task.id}
                            className="cursor-pointer hover:bg-muted/50"
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
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span
                                  className={`truncate ${
                                    task.completed
                                      ? "line-through text-muted-foreground"
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
                              ) : overdue ? (
                                <Badge variant="destructive">Atrasada</Badge>
                              ) : (
                                <Badge variant="outline">Pendente</Badge>
                              )}
                            </TableCell>
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
    </div>
  );
}
