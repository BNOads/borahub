import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, pointerWithin, rectIntersection, closestCenter, PointerSensor, useSensor, useSensors, CollisionDetection, UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus, ClipboardList, UserPlus, GripVertical, User, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "./KanbanColumn";
import { MentoriaTarefa } from "@/hooks/useMentoria";
import { cn } from "@/lib/utils";

interface MentoriaKanbanProps {
  tarefas: MentoriaTarefa[];
  onUpdateTarefa: (tarefa: MentoriaTarefa, newStatus: 'pending' | 'in_progress' | 'completed') => void;
  onToggleComplete: (tarefa: MentoriaTarefa) => void;
  onEditTarefa: (tarefa: MentoriaTarefa) => void;
  onDeleteTarefa: (tarefaId: string) => void;
  onCreateTarefa: () => void;
  onReplicarProcesso?: () => void;
  onOpenTaskDetail?: (tarefa: MentoriaTarefa) => void;
  onReorderTarefas?: (reorderedIds: { id: string; position: number }[]) => void;
  etapaName: string;
  filtroMentoradoExterno?: string | null;
  onClearFiltroMentorado?: () => void;
}

const columns = [
  { id: 'pending' as const, title: 'A Fazer', color: 'bg-yellow-500/10 border-yellow-500/30', bgColor: 'bg-yellow-500' },
  { id: 'in_progress' as const, title: 'Em Andamento', color: 'bg-blue-500/10 border-blue-500/30', bgColor: 'bg-blue-500' },
  { id: 'completed' as const, title: 'Concluído', color: 'bg-green-500/10 border-green-500/30', bgColor: 'bg-green-500' },
];

export function MentoriaKanban({
  tarefas,
  onUpdateTarefa,
  onToggleComplete,
  onEditTarefa,
  onDeleteTarefa,
  onCreateTarefa,
  onReplicarProcesso,
  onOpenTaskDetail,
  onReorderTarefas,
  etapaName,
  filtroMentoradoExterno,
  onClearFiltroMentorado,
}: MentoriaKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filtroMentorado, setFiltroMentorado] = useState<string>("todos");

  // Sync external filter with internal state
  const filtroAtivo = filtroMentoradoExterno !== undefined && filtroMentoradoExterno !== null 
    ? filtroMentoradoExterno 
    : filtroMentorado;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get unique mentorado names for filter
  const mentoradosUnicos = useMemo(() => {
    const nomes = tarefas
      .map(t => t.mentorado_nome)
      .filter((nome): nome is string => !!nome);
    return [...new Set(nomes)].sort();
  }, [tarefas]);

  // Filter tasks based on selected mentorado (using active filter)
  const tarefasFiltradas = useMemo(() => {
    if (filtroAtivo === "todos") return tarefas;
    if (filtroAtivo === "template") return tarefas.filter(t => !t.mentorado_nome);
    return tarefas.filter(t => t.mentorado_nome === filtroAtivo);
  }, [tarefas, filtroAtivo]);

  const tarefasByStatus = useMemo(() => {
    return {
      pending: tarefasFiltradas.filter(t => t.status === 'pending'),
      in_progress: tarefasFiltradas.filter(t => t.status === 'in_progress'),
      completed: tarefasFiltradas.filter(t => t.status === 'completed'),
    };
  }, [tarefasFiltradas]);

  const activeTarefa = useMemo(() => {
    if (!activeId) return null;
    return tarefas.find(t => t.id === activeId) || null;
  }, [activeId, tarefas]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;

    const tarefaId = active.id as string;
    const tarefa = tarefas.find(t => t.id === tarefaId);
    
    if (!tarefa) return;

    // Check if dropped on a column
    const targetColumn = columns.find(col => col.id === over.id);
    if (targetColumn && tarefa.status !== targetColumn.id) {
      onUpdateTarefa(tarefa, targetColumn.id);
      return;
    }

    // Check if dropped on another task in the same column (reorder)
    const overTarefa = tarefas.find(t => t.id === over.id);
    if (overTarefa && overTarefa.id !== tarefa.id && overTarefa.status === tarefa.status && onReorderTarefas) {
      const columnTarefas = tarefasByStatus[tarefa.status];
      const oldIndex = columnTarefas.findIndex(t => t.id === tarefa.id);
      const newIndex = columnTarefas.findIndex(t => t.id === overTarefa.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(columnTarefas, oldIndex, newIndex);
        const updates = reordered.map((t, idx) => ({ id: t.id, position: idx }));
        onReorderTarefas(updates);
      }
    } else if (overTarefa && overTarefa.status !== tarefa.status) {
      // Dropped on a task in a different column — change status
      onUpdateTarefa(tarefa, overTarefa.status);
    }
  };

  if (tarefas.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{etapaName}</h2>
          <div className="flex items-center gap-2">
            {onReplicarProcesso && (
              <Button 
                onClick={onReplicarProcesso}
                className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Replicar pra novo processo
              </Button>
            )}
            <Button size="sm" onClick={onCreateTarefa}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
          <ClipboardList className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma tarefa nesta etapa</h3>
          <p className="text-muted-foreground mb-4">
            Comece adicionando tarefas para "{etapaName}"
          </p>
          <Button onClick={onCreateTarefa}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{etapaName}</h2>
          
          {/* Filtro por Mentorado */}
          {mentoradosUnicos.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select 
                value={filtroAtivo} 
                onValueChange={(value) => {
                  setFiltroMentorado(value);
                  if (onClearFiltroMentorado && value === "todos") {
                    onClearFiltroMentorado();
                  }
                }}
              >
                <SelectTrigger className={cn(
                  "w-[180px] h-8 text-sm",
                  filtroMentoradoExterno && "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                )}>
                  <SelectValue placeholder="Filtrar mentorado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="template">Apenas Template</SelectItem>
                  {mentoradosUnicos.map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filtroMentoradoExterno && onClearFiltroMentorado && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearFiltroMentorado}
                  className="h-8 px-2 text-amber-600 hover:text-amber-700"
                >
                  Limpar filtro
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onReplicarProcesso && (
            <Button 
              onClick={onReplicarProcesso}
              className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Replicar pra novo processo
            </Button>
          )}
          <Button size="sm" onClick={onCreateTarefa}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tarefas={tarefasByStatus[column.id]}
              onToggleComplete={onToggleComplete}
              onEdit={onEditTarefa}
              onDelete={onDeleteTarefa}
              onOpenDetail={onOpenTaskDetail}
              onChangeStatus={onUpdateTarefa}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTarefa ? (
            <div className="opacity-90 rotate-3 scale-105">
              <Card className={cn(
                "cursor-grabbing shadow-xl",
                activeTarefa.mentorado_nome && "border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20"
              )}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <Checkbox checked={activeTarefa.status === 'completed'} className="mt-0.5" disabled />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium leading-tight",
                        activeTarefa.status === 'completed' && "line-through text-muted-foreground"
                      )}>
                        {activeTarefa.title}
                      </p>
                      {activeTarefa.mentorado_nome && (
                        <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          <User className="h-3 w-3" />
                          {activeTarefa.mentorado_nome}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
