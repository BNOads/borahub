import { useMemo } from "react";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MentoriaTaskCard } from "./MentoriaTaskCard";
import { MentoriaTarefa } from "@/hooks/useMentoria";
import { cn } from "@/lib/utils";

interface MentoriaKanbanProps {
  tarefas: MentoriaTarefa[];
  onUpdateTarefa: (tarefa: MentoriaTarefa, newStatus: 'pending' | 'in_progress' | 'completed') => void;
  onToggleComplete: (tarefa: MentoriaTarefa) => void;
  onEditTarefa: (tarefa: MentoriaTarefa) => void;
  onDeleteTarefa: (tarefaId: string) => void;
  onCreateTarefa: () => void;
  etapaName: string;
}

const columns = [
  { id: 'pending', title: 'A Fazer', color: 'bg-yellow-500/10 border-yellow-500/30' },
  { id: 'in_progress', title: 'Em Andamento', color: 'bg-blue-500/10 border-blue-500/30' },
  { id: 'completed', title: 'Concluído', color: 'bg-green-500/10 border-green-500/30' },
] as const;

export function MentoriaKanban({
  tarefas,
  onUpdateTarefa,
  onToggleComplete,
  onEditTarefa,
  onDeleteTarefa,
  onCreateTarefa,
  etapaName,
}: MentoriaKanbanProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tarefasByStatus = useMemo(() => {
    return {
      pending: tarefas.filter(t => t.status === 'pending'),
      in_progress: tarefas.filter(t => t.status === 'in_progress'),
      completed: tarefas.filter(t => t.status === 'completed'),
    };
  }, [tarefas]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const tarefaId = active.id as string;
    const tarefa = tarefas.find(t => t.id === tarefaId);
    
    if (!tarefa) return;

    // Check if dropped on a column
    const targetColumn = columns.find(col => col.id === over.id);
    if (targetColumn && tarefa.status !== targetColumn.id) {
      onUpdateTarefa(tarefa, targetColumn.id);
    }
  };

  if (tarefas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
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
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{etapaName}</h2>
        <Button size="sm" onClick={onCreateTarefa}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
          {columns.map((column) => (
            <div
              key={column.id}
              className={cn(
                "flex flex-col rounded-lg border-2 border-dashed p-3",
                column.color
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">{column.title}</h3>
                <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                  {tarefasByStatus[column.id].length}
                </span>
              </div>
              
              <ScrollArea className="flex-1">
                <SortableContext
                  items={tarefasByStatus[column.id].map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 pr-2">
                    {tarefasByStatus[column.id].map((tarefa) => (
                      <MentoriaTaskCard
                        key={tarefa.id}
                        tarefa={tarefa}
                        onToggleComplete={onToggleComplete}
                        onEdit={onEditTarefa}
                        onDelete={onDeleteTarefa}
                      />
                    ))}
                  </div>
                </SortableContext>
              </ScrollArea>
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
