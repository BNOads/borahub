import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MentoriaTaskCard } from "./MentoriaTaskCard";
import { MentoriaTarefa } from "@/hooks/useMentoria";
import { cn } from "@/lib/utils";

interface ColumnConfig {
  id: 'pending' | 'in_progress' | 'completed';
  title: string;
  color: string;
  bgColor: string;
}

interface KanbanColumnProps {
  column: ColumnConfig;
  tarefas: MentoriaTarefa[];
  onToggleComplete: (tarefa: MentoriaTarefa) => void;
  onEdit: (tarefa: MentoriaTarefa) => void;
  onDelete: (tarefaId: string) => void;
  onOpenDetail?: (tarefa: MentoriaTarefa) => void;
}

export function KanbanColumn({
  column,
  tarefas,
  onToggleComplete,
  onEdit,
  onDelete,
  onOpenDetail,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border-2 border-dashed p-3 transition-all min-h-[200px]",
        column.color,
        isOver && "ring-2 ring-primary border-primary bg-primary/5 scale-[1.02]"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full", column.bgColor)} />
          <h3 className="font-medium text-sm">{column.title}</h3>
        </div>
        <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
          {tarefas.length}
        </span>
      </div>
      
      <ScrollArea className="flex-1">
        <SortableContext
          items={tarefas.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 pr-2">
            {tarefas.map((tarefa) => (
              <MentoriaTaskCard
                key={tarefa.id}
                tarefa={tarefa}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}
