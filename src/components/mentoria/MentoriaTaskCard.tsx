import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Pencil, Trash2, User, Link2, Circle, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { MentoriaTarefa } from "@/hooks/useMentoria";
import { cn } from "@/lib/utils";

interface MentoriaTaskCardProps {
  tarefa: MentoriaTarefa;
  onToggleComplete: (tarefa: MentoriaTarefa) => void;
  onEdit: (tarefa: MentoriaTarefa) => void;
  onDelete: (tarefaId: string) => void;
  onOpenDetail?: (tarefa: MentoriaTarefa) => void;
  onChangeStatus?: (tarefa: MentoriaTarefa, newStatus: 'pending' | 'in_progress' | 'completed') => void;
}

export function MentoriaTaskCard({ tarefa, onToggleComplete, onEdit, onDelete, onOpenDetail, onChangeStatus }: MentoriaTaskCardProps) {
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
  const hasMentorado = !!tarefa.mentorado_nome;
  
  // Check if task has links stored
  const hasLinks = tarefa.description?.includes("[LINKS]") && tarefa.description?.includes("[/LINKS]");
  // Get clean description without links data
  const cleanDescription = tarefa.description?.replace(/\[LINKS\].*?\[\/LINKS\]/s, "").trim();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open detail if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="checkbox"]')) {
      return;
    }
    onOpenDetail?.(tarefa);
  };

  const statusOptions = [
    { value: 'pending' as const, label: 'A Fazer', icon: Circle, color: 'text-yellow-500' },
    { value: 'in_progress' as const, label: 'Em Andamento', icon: Clock, color: 'text-blue-500' },
    { value: 'completed' as const, label: 'Concluído', icon: CheckCircle2, color: 'text-green-500' },
  ];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className={cn(
        "cursor-pointer hover:shadow-md transition-all group",
        isDragging && "opacity-50 shadow-lg",
        isCompleted && "opacity-60",
        hasMentorado && "border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Checkbox */}
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => onToggleComplete(tarefa)}
            className="mt-0.5"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium leading-tight",
              isCompleted && "line-through text-muted-foreground"
            )}>
              {tarefa.title}
            </p>
            
            {cleanDescription && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {cleanDescription}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {hasMentorado && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  <User className="h-3 w-3" />
                  {tarefa.mentorado_nome}
                </div>
              )}
              {hasLinks && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                  <Link2 className="h-3 w-3" />
                  Links
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {onChangeStatus && (
                <>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <Circle className="h-4 w-4 mr-2" />
                      Alterar Status
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="bg-popover border shadow-lg z-50">
                        {statusOptions.map((option) => {
                          const Icon = option.icon;
                          const isCurrent = tarefa.status === option.value;
                          return (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isCurrent && onChangeStatus) {
                                  onChangeStatus(tarefa, option.value);
                                }
                              }}
                              className={cn("cursor-pointer", isCurrent && "bg-accent")}
                            >
                              <Icon className={cn("h-4 w-4 mr-2", option.color)} />
                              {option.label}
                              {isCurrent && <span className="ml-auto text-xs text-muted-foreground">atual</span>}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                </>
              )}
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
