import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useBulkUpdateTasks } from "@/hooks/useTasks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Edit3, Calendar, User, Repeat } from "lucide-react";
import { RECURRENCE_LABELS, RecurrenceType } from "@/types/tasks";

interface BulkEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTaskIds: string[];
  onSuccess?: () => void;
}

export function BulkEditModal({ 
  open, 
  onOpenChange, 
  selectedTaskIds,
  onSuccess 
}: BulkEditModalProps) {
  const { toast } = useToast();
  const { authReady, session } = useAuth();
  const bulkUpdate = useBulkUpdateTasks();

  // Campos a editar
  const [editDueDate, setEditDueDate] = useState(false);
  const [editAssignee, setEditAssignee] = useState(false);
  const [editRecurrence, setEditRecurrence] = useState(false);

  // Valores
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  // Buscar usuarios ativos
  const { data: users = [] } = useQuery({
    queryKey: ["profiles-for-bulk-edit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");

      if (error) return [];
      return data;
    },
    enabled: authReady && !!session && open,
  });

  const hasChanges = (editDueDate && dueDate) || (editAssignee && assignee) || editRecurrence;

  const handleSubmit = async () => {
    if (!hasChanges) {
      toast({ 
        title: "Nenhuma alteração selecionada", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const updates: Record<string, unknown> = {};
      
      if (editDueDate && dueDate) {
        updates.due_date = dueDate;
      }
      
      if (editAssignee && assignee) {
        updates.assignee = assignee;
      }
      
      if (editRecurrence) {
        updates.recurrence = recurrence !== "none" ? recurrence : null;
        updates.recurrence_end_date = recurrenceEndDate || null;
      }

      await bulkUpdate.mutateAsync({
        taskIds: selectedTaskIds,
        updates,
        newAssignee: editAssignee ? assignee : undefined,
      });

      toast({
        title: `${selectedTaskIds.length} tarefa${selectedTaskIds.length > 1 ? "s" : ""} atualizada${selectedTaskIds.length > 1 ? "s" : ""}`,
      });

      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao atualizar tarefas em massa:", error);
      toast({
        title: "Erro ao atualizar tarefas",
        description: "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setEditDueDate(false);
    setEditAssignee(false);
    setEditRecurrence(false);
    setDueDate("");
    setAssignee("");
    setRecurrence("none");
    setRecurrenceEndDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Editar {selectedTaskIds.length} tarefa{selectedTaskIds.length > 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <p className="text-sm text-muted-foreground">
            Selecione os campos que deseja alterar. As alterações serão aplicadas a todas as tarefas selecionadas.
          </p>

          {/* Data de entrega */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data de entrega
              </Label>
              <Switch
                checked={editDueDate}
                onCheckedChange={setEditDueDate}
              />
            </div>
            {editDueDate && (
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Responsável */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Responsável
              </Label>
              <Switch
                checked={editAssignee}
                onCheckedChange={setEditAssignee}
              />
            </div>
            {editAssignee && (
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.full_name}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Recorrência */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Recorrência
              </Label>
              <Switch
                checked={editRecurrence}
                onCheckedChange={setEditRecurrence}
              />
            </div>
            {editRecurrence && (
              <div className="space-y-3 mt-2">
                <Select 
                  value={recurrence} 
                  onValueChange={(v) => setRecurrence(v as RecurrenceType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RECURRENCE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {recurrence !== "none" && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Data final (opcional)
                    </Label>
                    <Input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || bulkUpdate.isPending}
          >
            {bulkUpdate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              `Salvar alterações`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
