import { useState } from "react";
import { Plus, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  title: string;
  priority: "Alta" | "Média" | "Baixa";
  status: "overdue" | "today" | "no-date";
  completed: boolean;
  dueTime?: string;
}

const initialTasks: Task[] = [
  { id: 1, title: "Revisar copy do email de lançamento", priority: "Alta", status: "overdue", completed: false, dueTime: "Ontem" },
  { id: 2, title: "Gravar vídeo de boas-vindas", priority: "Alta", status: "today", completed: false, dueTime: "14:00" },
  { id: 3, title: "Aprovar criativos do Instagram", priority: "Média", status: "today", completed: false, dueTime: "16:00" },
  { id: 4, title: "Atualizar planilha de leads", priority: "Baixa", status: "today", completed: true, dueTime: "10:00" },
  { id: 5, title: "Preparar pauta da reunião semanal", priority: "Média", status: "no-date", completed: false },
];

const priorityColors = {
  Alta: "bg-destructive/10 text-destructive border-destructive/20",
  Média: "bg-warning/10 text-warning border-warning/20",
  Baixa: "bg-muted text-muted-foreground border-muted",
};

const statusLabels = {
  overdue: { label: "Em atraso", icon: AlertCircle, color: "text-destructive" },
  today: { label: "Hoje", icon: Clock, color: "text-accent" },
  "no-date": { label: "Sem data", icon: Clock, color: "text-muted-foreground" },
};

export function TodaysTasks() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  const toggleTask = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const groupedTasks = {
    overdue: tasks.filter(t => t.status === "overdue" && !t.completed),
    today: tasks.filter(t => t.status === "today" && !t.completed),
    "no-date": tasks.filter(t => t.status === "no-date" && !t.completed),
    completed: tasks.filter(t => t.completed),
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Minhas Tarefas</h2>
          <p className="text-sm text-muted-foreground">
            {completedCount} de {totalCount} concluídas hoje
          </p>
        </div>
        <Button variant="gold" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nova Tarefa
        </Button>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progresso do dia</span>
          <span className="text-sm text-accent font-semibold">{progressPercentage}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {/* Overdue tasks */}
        {groupedTasks.overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Em atraso ({groupedTasks.overdue.length})</span>
            </div>
            <div className="space-y-2">
              {groupedTasks.overdue.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </div>
          </div>
        )}

        {/* Today's tasks */}
        {groupedTasks.today.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Hoje ({groupedTasks.today.length})</span>
            </div>
            <div className="space-y-2">
              {groupedTasks.today.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </div>
          </div>
        )}

        {/* No date tasks */}
        {groupedTasks["no-date"].length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Sem data ({groupedTasks["no-date"].length})</span>
            </div>
            <div className="space-y-2">
              {groupedTasks["no-date"].map((task) => (
                <TaskItem key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </div>
          </div>
        )}

        {/* Completed tasks */}
        {groupedTasks.completed.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">Concluídas ({groupedTasks.completed.length})</span>
            </div>
            <div className="space-y-2">
              {groupedTasks.completed.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({ task, onToggle }: { task: Task; onToggle: (id: number) => void }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border border-border transition-all hover:border-accent/30",
      task.completed && "opacity-60"
    )}>
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
        className="data-[state=checked]:bg-success data-[state=checked]:border-success"
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm truncate",
          task.completed && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        {task.dueTime && (
          <p className="text-xs text-muted-foreground">{task.dueTime}</p>
        )}
      </div>
      <Badge variant="outline" className={priorityColors[task.priority]}>
        {task.priority}
      </Badge>
    </div>
  );
}
