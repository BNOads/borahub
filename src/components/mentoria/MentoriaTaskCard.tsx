import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Pencil, Trash2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MentoriaTarefa } from "@/hooks/useMentoria";
import { cn } from "@/lib/utils";

interface MentoriaTaskCardProps {
  tarefa: MentoriaTarefa;
  onToggleComplete: (tarefa: MentoriaTarefa) => void;
  onEdit: (tarefa: MentoriaTarefa) => void;
  onDelete: (tarefaId: string) => void;
}

export function MentoriaTaskCard({ tarefa, onToggleComplete, onEdit, onDelete }: MentoriaTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tarefa.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = tarefa.status === 'completed';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        isDragging && "opacity-50 shadow-lg",
        isCompleted && "opacity-60"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Checkbox */}
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => onToggleComplete(tarefa)}
            className="mt-0.5"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium leading-tight",
              isCompleted && "line-through text-muted-foreground"
            )}>
              {tarefa.title}
            </p>
            
            {tarefa.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {tarefa.description}
              </p>
            )}

            {tarefa.mentorado_nome && (
              <Badge variant="secondary" className="mt-2 text-xs">
                <User className="h-3 w-3 mr-1" />
                {tarefa.mentorado_nome}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(tarefa)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(tarefa.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
