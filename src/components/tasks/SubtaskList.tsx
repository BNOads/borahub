import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Subtask } from "@/types/tasks";
import {
  useCreateSubtask,
  useToggleSubtaskComplete,
  useDeleteSubtask,
} from "@/hooks/useSubtasks";
import { useToast } from "@/hooks/use-toast";

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
}

export function SubtaskList({ taskId, subtasks }: SubtaskListProps) {
  const { toast } = useToast();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const createSubtask = useCreateSubtask();
  const toggleSubtask = useToggleSubtaskComplete();
  const deleteSubtask = useDeleteSubtask();

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    try {
      await createSubtask.mutateAsync({
        task_id: taskId,
        title: newSubtaskTitle.trim(),
        completed: false,
        position: subtasks.length,
      });
      setNewSubtaskTitle("");
    } catch {
      toast({
        title: "Erro ao adicionar subtarefa",
        variant: "destructive",
      });
    }
  };

  const handleToggle = async (subtask: Subtask) => {
    try {
      await toggleSubtask.mutateAsync({
        id: subtask.id,
        taskId,
        completed: !subtask.completed,
      });
    } catch {
      toast({
        title: "Erro ao atualizar subtarefa",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (subtaskId: string) => {
    try {
      await deleteSubtask.mutateAsync({ id: subtaskId, taskId });
    } catch {
      toast({
        title: "Erro ao excluir subtarefa",
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddSubtask();
    }
  };

  return (
    <div className="space-y-4">
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {completedCount}/{totalCount} ({progress}%)
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="space-y-2">
        {subtasks
          .sort((a, b) => a.position - b.position)
          .map((subtask) => (
            <div
              key={subtask.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg border border-border group",
                subtask.completed && "opacity-60"
              )}
            >
              <Checkbox
                checked={subtask.completed}
                onCheckedChange={() => handleToggle(subtask)}
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  subtask.completed && "line-through text-muted-foreground"
                )}
              >
                {subtask.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(subtask.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Adicionar subtarefa..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button
          size="icon"
          onClick={handleAddSubtask}
          disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
