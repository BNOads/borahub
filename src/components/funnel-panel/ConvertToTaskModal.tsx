import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskKeys } from "@/hooks/useTasks";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { RecurrenceType, RECURRENCE_LABELS } from "@/types/tasks";

interface ConvertToTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistItem: { id: string; title: string } | null;
  funnelId: string;
  onSuccess?: () => void;
}

export function ConvertToTaskModal({
  open,
  onOpenChange,
  checklistItem,
  funnelId,
  onSuccess,
}: ConvertToTaskModalProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [assignee, setAssignee] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");

  // Buscar dados do funil para incluir nome na tarefa
  const { data: funnel } = useQuery({
    queryKey: ["funnel-name", funnelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnels")
        .select("name, code")
        .eq("id", funnelId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!funnelId,
  });

  // Buscar usuários ativos para atribuição
  const { data: users = [] } = useQuery({
    queryKey: ["profiles-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Reset form quando abre
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!checklistItem) return;

    if (!assignee) {
      toast.error("Selecione um responsável");
      return;
    }

    if (!dueDate) {
      toast.error("Selecione uma data de vencimento");
      return;
    }

    setSaving(true);
    try {
      // Criar título com código/nome do funil
      const funnelPrefix = funnel?.code || funnel?.name || "";
      const cleanTitle = checklistItem.title.replace(/^\[(Diário|Pontual)\]\s*/i, "");
      const taskTitle = funnelPrefix ? `${funnelPrefix} | ${cleanTitle}` : cleanTitle;

      // Criar a tarefa
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: taskTitle,
          description: `Tarefa originada do checklist do funil: ${funnel?.name || ""}`,
          assignee: assignee,
          due_date: format(dueDate, "yyyy-MM-dd"),
          recurrence: recurrence !== "none" ? recurrence : null,
          priority: "media",
          category: "Funil",
        })
        .select("id")
        .single();

      if (taskError) throw taskError;

      // Atualizar item do checklist com dados da tarefa (NÃO marcar como concluído)
      await supabase
        .from("funnel_checklist")
        .update({
          linked_task_id: taskData.id,
          assigned_to: assignee,
          task_due_date: format(dueDate, "yyyy-MM-dd"),
        })
        .eq("id", checklistItem.id);

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
      queryClient.invalidateQueries({ queryKey: taskKeys.byUser(assignee) });
      queryClient.invalidateQueries({ queryKey: ["funnel-checklist", funnelId] });

      toast.success("Tarefa criada e atribuída!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error("Erro ao criar tarefa: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDueDate(undefined);
    setAssignee("");
    setRecurrence("none");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atribuir Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Título da Tarefa</Label>
            <Input
              value={`${funnel?.code || funnel?.name || ""} | ${checklistItem?.title.replace(/^\[(Diário|Pontual)\]\s*/i, "") || ""}`}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Responsável *</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.full_name}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data de Vencimento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "dd/MM/yyyy") : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Recorrência</Label>
            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceType)}>
              <SelectTrigger>
                <SelectValue placeholder="Sem recorrência" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RECURRENCE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar Tarefa"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
