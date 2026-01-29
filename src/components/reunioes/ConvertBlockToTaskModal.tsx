import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { MeetingBlock } from "@/hooks/useMeetings";
import { useLinkBlockToTask } from "@/hooks/useMeetingBlocks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RecurrenceType, RECURRENCE_LABELS, TaskPriority } from "@/types/tasks";

interface Profile {
  id: string;
  full_name: string;
}

interface ConvertBlockToTaskModalProps {
  block: MeetingBlock;
  meetingId: string;
  meetingTitle: string;
  onClose: () => void;
}

export function ConvertBlockToTaskModal({
  block,
  meetingId,
  meetingTitle,
  onClose,
}: ConvertBlockToTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(block.content);
  const [assignee, setAssignee] = useState<string>("");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const linkBlockToTask = useLinkBlockToTask();

  // Generate title from block content
  useEffect(() => {
    const blockPreview = block.content.split("\n")[0].slice(0, 50);
    const prefix = `[${meetingTitle}]`;
    setTitle(`${prefix} ${blockPreview}${block.content.length > 50 ? "..." : ""}`);
  }, [block.content, meetingTitle]);

  // Fetch team members
  useEffect(() => {
    async function fetchProfiles() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      
      if (data) {
        setProfiles(data);
      }
    }
    fetchProfiles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignee) return;

    setIsSubmitting(true);

    try {
      // Get assignee name
      const selectedProfile = profiles.find((p) => p.id === assignee);

      // Create task
      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          title: title.trim(),
          description: description || null,
          assignee: selectedProfile?.full_name || null,
          assigned_to_id: assignee,
          priority,
          due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
          recurrence: recurrence !== "none" ? recurrence : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Link block to task
      linkBlockToTask.mutate(
        { blockId: block.id, taskId: task.id, meetingId },
        {
          onSuccess: () => {
            toast.success("Tarefa criada e vinculada ao bloco!");
            onClose();
          },
        }
      );
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Erro ao criar tarefa");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Tarefa a partir do Bloco</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Tarefa</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da tarefa"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
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
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || !assignee || isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
