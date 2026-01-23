import { useState } from "react";
import { Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Subtask, SubtaskWithChildren } from "@/types/tasks";
import {
  useCreateSubtask,
  useToggleSubtaskComplete,
  useDeleteSubtask,
} from "@/hooks/useSubtasks";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
}

// Build tree structure from flat subtasks array
function buildSubtaskTree(subtasks: Subtask[]): SubtaskWithChildren[] {
  const map = new Map<string, SubtaskWithChildren>();
  const roots: SubtaskWithChildren[] = [];

  // Create map of all subtasks with empty children arrays
  subtasks.forEach((subtask) => {
    map.set(subtask.id, { ...subtask, children: [] });
  });

  // Build tree by assigning children to parents
  subtasks.forEach((subtask) => {
    const node = map.get(subtask.id)!;
    if (subtask.parent_subtask_id && map.has(subtask.parent_subtask_id)) {
      map.get(subtask.parent_subtask_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort by position
  const sortByPosition = (a: SubtaskWithChildren, b: SubtaskWithChildren) =>
    (a.position ?? 0) - (b.position ?? 0);

  const sortTree = (nodes: SubtaskWithChildren[]): SubtaskWithChildren[] => {
    return nodes.sort(sortByPosition).map((node) => ({
      ...node,
      children: sortTree(node.children),
    }));
  };

  return sortTree(roots);
}

// Count all subtasks recursively
function countSubtasks(subtasks: SubtaskWithChildren[]): { total: number; completed: number } {
  let total = 0;
  let completed = 0;

  const count = (nodes: SubtaskWithChildren[]) => {
    nodes.forEach((node) => {
      total++;
      if (node.completed) completed++;
      count(node.children);
    });
  };

  count(subtasks);
  return { total, completed };
}

interface SubtaskItemProps {
  subtask: SubtaskWithChildren;
  taskId: string;
  level: number;
  allSubtasks: Subtask[];
}

function SubtaskItem({ subtask, taskId, level, allSubtasks }: SubtaskItemProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState("");

  const createSubtask = useCreateSubtask();
  const toggleSubtask = useToggleSubtaskComplete();
  const deleteSubtask = useDeleteSubtask();

  const hasChildren = subtask.children.length > 0;
  const maxLevel = 5; // Limit nesting depth

  const handleToggle = async () => {
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

  const handleDelete = async () => {
    try {
      await deleteSubtask.mutateAsync({ id: subtask.id, taskId });
    } catch {
      toast({
        title: "Erro ao excluir subtarefa",
        variant: "destructive",
      });
    }
  };

  const handleAddChild = async () => {
    if (!newChildTitle.trim()) return;

    try {
      const childrenCount = allSubtasks.filter(
        (s) => s.parent_subtask_id === subtask.id
      ).length;

      await createSubtask.mutateAsync({
        task_id: taskId,
        title: newChildTitle.trim(),
        completed: false,
        position: childrenCount,
        parent_subtask_id: subtask.id,
      });
      setNewChildTitle("");
      setShowAddChild(false);
    } catch {
      toast({
        title: "Erro ao adicionar subtarefa",
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddChild();
    } else if (e.key === "Escape") {
      setShowAddChild(false);
      setNewChildTitle("");
    }
  };

  return (
    <div className="space-y-1">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg border border-border group hover:bg-muted/50 transition-colors",
            subtask.completed && "opacity-60"
          )}
          style={{ marginLeft: `${level * 16}px` }}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-5" />
          )}

          <Checkbox
            checked={subtask.completed}
            onCheckedChange={handleToggle}
          />

          <span
            className={cn(
              "flex-1 text-sm",
              subtask.completed && "line-through text-muted-foreground"
            )}
          >
            {subtask.title}
          </span>

          {level < maxLevel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowAddChild(!showAddChild)}
              title="Adicionar sub-subtarefa"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>

        {showAddChild && (
          <div
            className="flex gap-2 mt-1"
            style={{ marginLeft: `${(level + 1) * 16 + 20}px` }}
          >
            <Input
              placeholder="Nova sub-subtarefa..."
              value={newChildTitle}
              onChange={(e) => setNewChildTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-8 text-sm"
              autoFocus
            />
            <Button
              size="sm"
              className="h-8"
              onClick={handleAddChild}
              disabled={!newChildTitle.trim() || createSubtask.isPending}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {hasChildren && (
          <CollapsibleContent>
            <div className="space-y-1 mt-1">
              {subtask.children.map((child) => (
                <SubtaskItem
                  key={child.id}
                  subtask={child}
                  taskId={taskId}
                  level={level + 1}
                  allSubtasks={allSubtasks}
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export function SubtaskList({ taskId, subtasks }: SubtaskListProps) {
  const { toast } = useToast();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const createSubtask = useCreateSubtask();

  const tree = buildSubtaskTree(subtasks);
  const { total: totalCount, completed: completedCount } = countSubtasks(tree);
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    try {
      const rootSubtasksCount = subtasks.filter((s) => !s.parent_subtask_id).length;

      await createSubtask.mutateAsync({
        task_id: taskId,
        title: newSubtaskTitle.trim(),
        completed: false,
        position: rootSubtasksCount,
        parent_subtask_id: null,
      });
      setNewSubtaskTitle("");
    } catch {
      toast({
        title: "Erro ao adicionar subtarefa",
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

      <div className="space-y-1">
        {tree.map((subtask) => (
          <SubtaskItem
            key={subtask.id}
            subtask={subtask}
            taskId={taskId}
            level={0}
            allSubtasks={subtasks}
          />
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
