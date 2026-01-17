import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Flag, Users, AlertTriangle, CheckCircle2, Clock, ListTodo } from "lucide-react";
import type { TaskWithSubtasks } from "@/types/tasks";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface AdminTasksPanelProps {
  tasks: TaskWithSubtasks[];
  users: { id: string; full_name: string; display_name: string | null; avatar_url?: string | null }[];
  isLoading: boolean;
}

const CHART_COLORS = [
  "hsl(221, 83%, 53%)",   // Blue
  "hsl(142, 76%, 36%)",   // Green
  "hsl(30, 100%, 50%)",   // Orange
  "hsl(280, 87%, 65%)",   // Purple
  "hsl(350, 89%, 60%)",   // Red/Pink
  "hsl(190, 95%, 39%)",   // Cyan
  "hsl(45, 93%, 47%)",    // Yellow
  "hsl(330, 81%, 60%)",   // Magenta
];

export function AdminTasksPanel({ tasks, users, isLoading }: AdminTasksPanelProps) {
  // Group tasks by assignee
  const tasksByAssignee = useMemo(() => {
    const grouped: Record<string, TaskWithSubtasks[]> = {};
    
    tasks.forEach((task) => {
      const assignee = task.assignee || "Sem responsável";
      if (!grouped[assignee]) {
        grouped[assignee] = [];
      }
      grouped[assignee].push(task);
    });

    return grouped;
  }, [tasks]);

  // Priority distribution data
  const priorityData = useMemo(() => {
    const alta = tasks.filter((t) => t.priority === "alta" && !t.completed).length;
    const media = tasks.filter((t) => t.priority === "media" && !t.completed).length;
    const baixa = tasks.filter((t) => t.priority === "baixa" && !t.completed).length;

    return [
      { name: "Alta", value: alta, fill: "hsl(var(--destructive))" },
      { name: "Média", value: media, fill: "hsl(var(--warning))" },
      { name: "Baixa", value: baixa, fill: "hsl(var(--muted-foreground))" },
    ];
  }, [tasks]);

  // Tasks per user for pie chart
  const tasksPerUserData = useMemo(() => {
    return Object.entries(tasksByAssignee)
      .map(([assignee, userTasks], index) => ({
        name: assignee,
        value: userTasks.filter((t) => !t.completed).length,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [tasksByAssignee]);

  // Bar chart data for tasks by user
  const barChartData = useMemo(() => {
    return Object.entries(tasksByAssignee)
      .map(([assignee, userTasks]) => ({
        name: assignee.split(" ")[0],
        pendentes: userTasks.filter((t) => !t.completed).length,
        concluidas: userTasks.filter((t) => t.completed).length,
        atrasadas: userTasks.filter((t) => {
          if (!t.due_date || t.completed) return false;
          const dueDate = new Date(t.due_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return dueDate < today;
        }).length,
      }))
      .sort((a, b) => b.pendentes - a.pendentes);
  }, [tasksByAssignee]);

  const chartConfig = {
    pendentes: { label: "Pendentes", color: "hsl(var(--primary))" },
    concluidas: { label: "Concluídas", color: "hsl(142, 76%, 36%)" },
    atrasadas: { label: "Atrasadas", color: "hsl(var(--destructive))" },
  };

  const pieChartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    tasksPerUserData.forEach((item) => {
      config[item.name] = { label: item.name, color: item.fill };
    });
    return config;
  }, [tasksPerUserData]);

  const isOverdue = (dateString: string | null, completed: boolean) => {
    if (!dateString || completed) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "alta":
        return <Badge variant="destructive" className="text-xs">Alta</Badge>;
      case "media":
        return <Badge variant="outline" className="text-xs border-warning text-warning">Média</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Baixa</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Painel Administrativo de Tarefas</h2>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Priority Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Distribuição por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={priorityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-2">
              {priorityData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks per User Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tarefas por Colaborador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieChartConfig} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={tasksPerUserData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {tasksPerUserData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
              {tasksPerUserData.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name.split(" ")[0]}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart - Status by User */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Status por Colaborador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={barChartData.slice(0, 5)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="pendentes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="atrasadas" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Pendentes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
                <span className="text-xs text-muted-foreground">Atrasadas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks by Assignee */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          Tarefas por Responsável
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(tasksByAssignee)
            .sort(([, a], [, b]) => {
              const aPending = a.filter((t) => !t.completed).length;
              const bPending = b.filter((t) => !t.completed).length;
              return bPending - aPending;
            })
            .map(([assignee, userTasks]) => {
              const pendingTasks = userTasks.filter((t) => !t.completed);
              const completedTasks = userTasks.filter((t) => t.completed);
              const overdueTasks = pendingTasks.filter((t) => isOverdue(t.due_date, t.completed));
              const highPriority = pendingTasks.filter((t) => t.priority === "alta");
              const completionRate = userTasks.length > 0
                ? Math.round((completedTasks.length / userTasks.length) * 100)
                : 0;

              // Find user by full_name to get avatar_url
              const user = users.find((u) => u.full_name === assignee);
              const avatarUrl = user?.avatar_url;

              return (
                <Card key={assignee} className="overflow-hidden">
                  <CardHeader className="pb-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {avatarUrl && <AvatarImage src={avatarUrl} alt={assignee} />}
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {assignee.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{assignee}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {pendingTasks.length} pendentes • {completedTasks.length} concluídas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-primary">{pendingTasks.length}</span>
                        <p className="text-xs text-muted-foreground">tarefas</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-muted-foreground">Atrasadas:</span>
                        <span className={cn("font-medium", overdueTasks.length > 0 && "text-destructive")}>
                          {overdueTasks.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Flag className="h-4 w-4 text-destructive" />
                        <span className="text-muted-foreground">Alta:</span>
                        <span className="font-medium">{highPriority.length}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">Taxa:</span>
                        <span className="font-medium">{completionRate}%</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <Progress value={completionRate} className="h-2" />
                    </div>

                    {/* Task list */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {pendingTasks.slice(0, 5).map((task) => (
                        <Link
                          key={task.id}
                          to={`/tarefas/${task.id}`}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getPriorityBadge(task.priority)}
                            <span className="text-sm truncate">{task.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {task.due_date && (
                              <span
                                className={cn(
                                  "text-xs flex items-center gap-1",
                                  isOverdue(task.due_date, task.completed)
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                )}
                              >
                                <Clock className="h-3 w-3" />
                                {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                      {pendingTasks.length > 5 && (
                        <p className="text-xs text-center text-muted-foreground py-1">
                          + {pendingTasks.length - 5} mais tarefas
                        </p>
                      )}
                      {pendingTasks.length === 0 && (
                        <p className="text-sm text-center text-muted-foreground py-4">
                          Nenhuma tarefa pendente 🎉
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}
