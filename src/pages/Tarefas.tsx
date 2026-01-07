import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Plus,
  Calendar,
  User,
  Flag,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "alta" | "media" | "baixa";
  category: string;
  assignee: string;
  dueDate: string;
  completed: boolean;
}

const categories = [
  "Lançamento",
  "Marketing",
  "Vendas",
  "Suporte",
  "Administrativo",
];

const team = [
  "Maria Santos",
  "Pedro Lima",
  "Ana Costa",
  "Lucas Oliveira",
  "Julia Silva",
];

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Revisar copy da página de vendas",
    description: "Fazer revisão completa dos textos antes do lançamento",
    priority: "alta",
    category: "Lançamento",
    assignee: "Maria Santos",
    dueDate: "2026-01-10",
    completed: false,
  },
  {
    id: "2",
    title: "Criar sequência de emails",
    description: "Escrever 5 emails para a sequência de aquecimento",
    priority: "media",
    category: "Marketing",
    assignee: "Ana Costa",
    dueDate: "2026-01-12",
    completed: false,
  },
  {
    id: "3",
    title: "Configurar pixel do Facebook",
    description: "Instalar e testar pixel nas páginas de vendas",
    priority: "alta",
    category: "Marketing",
    assignee: "Lucas Oliveira",
    dueDate: "2026-01-08",
    completed: true,
  },
  {
    id: "4",
    title: "Responder tickets de suporte",
    description: "Verificar e responder todos os tickets pendentes",
    priority: "baixa",
    category: "Suporte",
    assignee: "Julia Silva",
    dueDate: "2026-01-07",
    completed: false,
  },
];

export default function Tarefas() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [newTask, setNewTask] = useState<Omit<Task, "id" | "completed">>({
    title: "",
    description: "",
    priority: "media",
    category: "",
    assignee: "",
    dueDate: "",
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesPriority =
      filterPriority === "all" || task.priority === filterPriority;
    const matchesCategory =
      filterCategory === "all" || task.category === filterCategory;
    return matchesSearch && matchesPriority && matchesCategory;
  });

  const pendingTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  const handleToggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category,
      assignee: task.assignee,
      dueDate: task.dueDate,
    });
    setIsDialogOpen(true);
  };

  const handleSaveTask = () => {
    if (!newTask.title.trim()) return;

    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? { ...t, ...newTask }
            : t
        )
      );
    } else {
      const task: Task = {
        id: Date.now().toString(),
        ...newTask,
        completed: false,
      };
      setTasks((prev) => [...prev, task]);
    }

    setNewTask({
      title: "",
      description: "",
      priority: "media",
      category: "",
      assignee: "",
      dueDate: "",
    });
    setEditingTask(null);
    setIsDialogOpen(false);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTask(null);
    setNewTask({
      title: "",
      description: "",
      priority: "media",
      category: "",
      assignee: "",
      dueDate: "",
    });
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const isOverdue = (dateString: string, completed: boolean) => {
    if (completed) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tarefas</h1>
            <p className="text-muted-foreground">
              Gerencie todas as tarefas da equipe
            </p>
          </div>

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
                  {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    placeholder="Digite o título da tarefa"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask((prev) => ({ ...prev, title: e.target.value }))
                    }
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva a tarefa..."
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask((prev) => ({
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
                      value={newTask.priority}
                      onValueChange={(value: "alta" | "media" | "baixa") =>
                        setNewTask((prev) => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={newTask.category}
                      onValueChange={(value) =>
                        setNewTask((prev) => ({ ...prev, category: value }))
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
                    <Label>Responsável</Label>
                    <Select
                      value={newTask.assignee}
                      onValueChange={(value) =>
                        setNewTask((prev) => ({ ...prev, assignee: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {team.map((member) => (
                          <SelectItem key={member} value={member}>
                            {member}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Data de entrega</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) =>
                        setNewTask((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveTask}>
                    {editingTask ? "Salvar" : "Criar Tarefa"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

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
                <SelectItem value="media">Média</SelectItem>
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
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Circle className="h-4 w-4" />
              <span className="text-sm">Pendentes</span>
            </div>
            <p className="text-2xl font-bold">{pendingTasks.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Concluídas</span>
            </div>
            <p className="text-2xl font-bold">{completedTasks.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Atrasadas</span>
            </div>
            <p className="text-2xl font-bold">
              {tasks.filter((t) => isOverdue(t.dueDate, t.completed)).length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Flag className="h-4 w-4 text-destructive" />
              <span className="text-sm">Alta prioridade</span>
            </div>
            <p className="text-2xl font-bold">
              {pendingTasks.filter((t) => t.priority === "alta").length}
            </p>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-6">
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
                Concluídas
              </h2>
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggleComplete}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    getPriorityColor={getPriorityColor}
                    formatDate={formatDate}
                    isOverdue={isOverdue}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma tarefa encontrada</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  getPriorityColor: (priority: string) => string;
  formatDate: (date: string) => string;
  isOverdue: (date: string, completed: boolean) => boolean;
}

function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  getPriorityColor,
  formatDate,
  isOverdue,
}: TaskItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border border-border bg-card transition-all hover:shadow-sm",
        task.completed && "opacity-60"
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
        className="mt-1"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h3
              className={cn(
                "font-medium",
                task.completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {task.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
              ? "Média"
              : "Baixa"}
          </Badge>

          {task.category && (
            <Badge variant="secondary">{task.category}</Badge>
          )}

          {task.assignee && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              {task.assignee}
            </div>
          )}

          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm",
                isOverdue(task.dueDate, task.completed)
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
