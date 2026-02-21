import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreateBulkTasks } from "@/hooks/useTasks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ListPlus } from "lucide-react";

interface BulkTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkTaskModal({ open, onOpenChange }: BulkTaskModalProps) {
  const { toast } = useToast();
  const { authReady, session } = useAuth();
  const createBulkTasks = useCreateBulkTasks();

  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [titlesText, setTitlesText] = useState("");

  // Buscar usuarios ativos
  const { data: users = [] } = useQuery({
    queryKey: ["profiles-for-bulk-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("is_active", true)
        .order("full_name");

      if (error) return [];
      return data;
    },
    enabled: authReady && !!session && open,
  });

  // Parse dos títulos
  const titles = useMemo(() => {
    return titlesText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [titlesText]);

  const taskCount = titles.length;
  const isValid = assignee && dueDate && taskCount > 0 && taskCount <= 50;

  const handleSubmit = async () => {
    if (!isValid) {
      if (!assignee) {
        toast({ title: "Selecione um responsável", variant: "destructive" });
        return;
      }
      if (!dueDate) {
        toast({ title: "Selecione uma data de entrega", variant: "destructive" });
        return;
      }
      if (taskCount === 0) {
        toast({ title: "Digite pelo menos um título", variant: "destructive" });
        return;
      }
      if (taskCount > 50) {
        toast({ title: "Máximo de 50 tarefas por vez", variant: "destructive" });
        return;
      }
      return;
    }

    try {
      const tasksToCreate = titles.map((title) => ({
        title: title.trim(),
        assignee,
        due_date: dueDate,
        priority: "media" as const,
        completed: false,
        position: 0,
      }));

      // Validar títulos antes de enviar
      const invalidTitles = tasksToCreate.filter(t => !t.title || t.title.length === 0);
      if (invalidTitles.length > 0) {
        toast({
          title: "Títulos inválidos",
          description: "Alguns títulos estão vazios. Verifique a lista.",
          variant: "destructive",
        });
        return;
      }

      await createBulkTasks.mutateAsync({ tasks: tasksToCreate, assignee });

      toast({
        title: `${taskCount} tarefa${taskCount > 1 ? "s" : ""} criada${taskCount > 1 ? "s" : ""}`,
        description: `Atribuídas a ${assignee}`,
      });

      // Reset form
      setAssignee("");
      setDueDate("");
      setTitlesText("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao criar tarefas em massa:", error);
      const errorMessage = error?.message || "Erro desconhecido";
      toast({
        title: "Erro ao criar tarefas",
        description: errorMessage.includes("duplicate") 
          ? "Algumas tarefas já existem" 
          : errorMessage.includes("vazios")
            ? errorMessage
            : "Verifique os dados e tente novamente",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setAssignee("");
    setDueDate("");
    setTitlesText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5" />
            Criar Tarefas em Massa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.full_name}>
                      <div className="flex items-center gap-2">
                        <img
                          src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&size=24&background=random`}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover shrink-0"
                        />
                        {user.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data de entrega *</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Títulos das tarefas (1 por linha) *</Label>
            <Textarea
              placeholder="Revisar copy do email&#10;Aprovar banner do Instagram&#10;Validar link de pagamento&#10;Conferir automação de emails"
              value={titlesText}
              onChange={(e) => setTitlesText(e.target.value)}
              className="min-h-[180px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              {taskCount > 0 ? (
                <>
                  <span className="font-medium text-foreground">{taskCount}</span>{" "}
                  tarefa{taskCount > 1 ? "s" : ""} será{taskCount > 1 ? "ão" : ""} criada{taskCount > 1 ? "s" : ""}
                  {taskCount > 50 && (
                    <span className="text-destructive ml-2">(máximo 50)</span>
                  )}
                </>
              ) : (
                "Digite os títulos, um por linha"
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createBulkTasks.isPending}
          >
            {createBulkTasks.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              `Criar ${taskCount > 0 ? taskCount : ""} tarefa${taskCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
