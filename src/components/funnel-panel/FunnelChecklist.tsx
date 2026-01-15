import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { FunnelChecklistItem } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FunnelChecklistProps {
  funnelId: string;
}

export function FunnelChecklist({ funnelId }: FunnelChecklistProps) {
  const [items, setItems] = useState<FunnelChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("funnel_checklist")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching checklist:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [funnelId]);

  const toggleItem = async (item: FunnelChecklistItem) => {
    try {
      const { error } = await supabase
        .from("funnel_checklist")
        .update({ is_completed: !item.is_completed })
        .eq("id", item.id);

      if (error) throw error;
      setItems(items.map((i) => (i.id === item.id ? { ...i, is_completed: !i.is_completed } : i)));
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const addItem = async () => {
    if (!newItem.trim()) return;

    try {
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order_index)) : -1;
      const { error } = await supabase.from("funnel_checklist").insert({
        funnel_id: funnelId,
        title: newItem.trim(),
        order_index: maxOrder + 1,
      });

      if (error) throw error;
      toast.success("Item adicionado!");
      setNewItem("");
      fetchItems();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from("funnel_checklist").delete().eq("id", id);
      if (error) throw error;
      setItems(items.filter((i) => i.id !== id));
      toast.success("Item removido!");
    } catch (error: any) {
      toast.error("Erro: " + error.message);
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
        {/* Add new item */}
        <div className="flex gap-2 mb-4">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Adicionar item..."
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Button size="icon" onClick={addItem} disabled={!newItem.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Items */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
            ))}
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
                  checked={item.is_completed}
                  onCheckedChange={() => toggleItem(item)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm font-medium ${
                      item.is_completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.description && (
                    <p className={`text-xs mt-0.5 ${
                      item.is_completed ? "text-muted-foreground/60" : "text-muted-foreground"
                    }`}>
                      {item.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive flex-shrink-0"
                  onClick={() => deleteItem(item.id)}
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
