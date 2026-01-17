import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckSquare, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  useFunnelChecklist, 
  useCreateChecklistItem, 
  useUpdateChecklistItem, 
  useDeleteChecklistItem 
} from "@/hooks/useFunnelExtras";

interface FunnelChecklistProps {
  funnelId: string;
}

export function FunnelChecklist({ funnelId }: FunnelChecklistProps) {
  const { data: items = [], isLoading } = useFunnelChecklist(funnelId);
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();

  const [newItem, setNewItem] = useState("");

  const toggleItem = async (item: { id: string; is_completed: boolean | null }) => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        funnelId,
        is_completed: !item.is_completed,
      });
    } catch {
      toast.error("Erro ao atualizar item");
    }
  };

  const addItem = async () => {
    if (!newItem.trim()) return;

    try {
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order_index || 0)) : -1;
      await createItem.mutateAsync({
        funnel_id: funnelId,
        title: newItem.trim(),
        order_index: maxOrder + 1,
      });
      setNewItem("");
      toast.success("Item adicionado!");
    } catch {
      toast.error("Erro ao adicionar item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItem.mutateAsync({ id, funnelId });
      toast.success("Item removido!");
    } catch {
      toast.error("Erro ao remover item");
    }
  };

  const completedCount = items.filter((i) => i.is_completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-accent" />
            Checklist Operacional
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{items.length}
          </span>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Adicionar item..."
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Button 
            size="icon" 
            onClick={addItem} 
            disabled={!newItem.trim() || createItem.isPending}
          >
            {createItem.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Checklist vazio</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/5 transition-colors group border border-transparent hover:border-border"
              >
                <Checkbox
                  checked={item.is_completed || false}
                  onCheckedChange={() => toggleItem(item)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${item.is_completed ? "line-through text-muted-foreground" : ""}`}>
                    {item.title}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive flex-shrink-0"
                  onClick={() => handleDeleteItem(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
