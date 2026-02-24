import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, Users, X, Search } from "lucide-react";
import {
  useCreateEvent,
  useUpdateEvent,
  type Event,
  type EventInsert,
} from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { RecurrenceType, RECURRENCE_LABELS } from "@/types/tasks";
import { supabase } from "@/integrations/supabase/client";
import { useCreateTask } from "@/hooks/useTasks";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  onSuccess: () => void;
  defaultDate?: string;
}

const eventTypes = [
  { value: "reuniao", label: "Reuniao" },
  { value: "lancamento", label: "Lancamento" },
  { value: "deadline", label: "Deadline" },
  { value: "evento", label: "Evento" },
  { value: "outro", label: "Outro" },
];

interface TeamMember {
  id: string;
  full_name: string;
}

export function EventModal({
  open,
  onOpenChange,
  event,
  onSuccess,
  defaultDate,
}: EventModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const createTask = useCreateTask();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: defaultDate || new Date().toISOString().split("T")[0],
    event_time: "09:00",
    end_time: "10:00",
    location: "",
    meeting_link: "",
    event_type: "reuniao",
    recurrence: "none" as RecurrenceType,
    recurrence_end_date: "",
    color: "#6366f1",
  });

  const isLoading = createEvent.isPending || updateEvent.isPending;
  const isEditing = !!event;

  // Load team members
  useEffect(() => {
    if (!open) return;
    const loadMembers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (data) setTeamMembers(data.filter(m => m.full_name));
    };
    loadMembers();
  }, [open]);

  // Helper to calculate end time from start + duration
  const calcEndTime = (startTime: string, durationMin: number) => {
    const [h, m] = startTime.split(":").map(Number);
    const totalMin = h * 60 + m + durationMin;
    const eh = Math.floor(totalMin / 60) % 24;
    const em = totalMin % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  };

  // Helper to calculate duration in minutes from two time strings
  const calcDuration = (start: string, end: string) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60; // next day
    return diff;
  };

  useEffect(() => {
    if (event) {
      const startTime = event.event_time.slice(0, 5);
      const dur = event.duration_minutes || 60;
      setFormData({
        title: event.title,
        description: event.description || "",
        event_date: event.event_date,
        event_time: startTime,
        end_time: calcEndTime(startTime, dur),
        location: event.location || "",
        meeting_link: event.meeting_link || "",
        event_type: event.event_type || "reuniao",
        recurrence: (event.recurrence as RecurrenceType) || "none",
        recurrence_end_date: event.recurrence_end_date || "",
        color: event.color || "#6366f1",
      });
      setSelectedParticipants((event as any).participants || []);
    } else {
      setFormData({
        title: "",
        description: "",
        event_date: defaultDate || new Date().toISOString().split("T")[0],
        event_time: "09:00",
        end_time: "10:00",
        location: "",
        meeting_link: "",
        event_type: "reuniao",
        recurrence: "none",
        recurrence_end_date: "",
        color: "#6366f1",
      });
      setSelectedParticipants([]);
    }
  }, [event, defaultDate, open]);

  const toggleParticipant = (name: string) => {
    setSelectedParticipants(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Titulo obrigatorio",
        description: "Por favor, informe o titulo do evento.",
        variant: "destructive",
      });
      return;
    }

    try {
      const eventData: EventInsert = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        event_date: formData.event_date,
        event_time: formData.event_time + ":00",
        duration_minutes: calcDuration(formData.event_time, formData.end_time) || null,
        location: formData.location.trim() || null,
        meeting_link: formData.meeting_link.trim() || null,
        event_type: formData.event_type,
        created_by: user?.id || null,
        recurrence: formData.recurrence,
        recurrence_end_date: formData.recurrence_end_date || null,
        participants: selectedParticipants,
        color: formData.color || null,
      };

      const previousParticipants = (event as any)?.participants || [];

      if (isEditing && event) {
        await updateEvent.mutateAsync({
          id: event.id,
          updates: eventData,
        });
        toast({
          title: "Evento atualizado",
          description: "O evento foi atualizado com sucesso.",
        });
      } else {
        await createEvent.mutateAsync(eventData);
        toast({
          title: "Evento criado",
          description: "O evento foi criado com sucesso.",
        });
      }

      // Create tasks for NEW participants
      const newParticipants = selectedParticipants.filter(
        p => !previousParticipants.includes(p)
      );

      for (const participantName of newParticipants) {
        try {
          const member = teamMembers.find(m => m.full_name === participantName);
          await createTask.mutateAsync({
            title: `📅 ${formData.title.trim()}`,
            description: `Participação no evento: ${formData.title.trim()}\nData: ${formData.event_date}\nHorário: ${formData.event_time}${formData.location ? `\nLocal: ${formData.location}` : ''}${formData.meeting_link ? `\nLink: ${formData.meeting_link}` : ''}`,
            assignee: participantName,
            due_date: formData.event_date,
            due_time: formData.event_time + ":00",
            priority: "media",
            category: "Agenda",
          });
        } catch (err) {
          console.error("Error creating task for participant:", participantName, err);
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: isEditing ? "Erro ao atualizar" : "Erro ao criar",
        description: error.message || "Ocorreu um erro ao salvar o evento.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-2">
            <DialogTitle>
              {isEditing ? "Editar Evento" : "Novo Evento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="title" className="text-xs">Titulo *</Label>
              <Input
                id="title"
                placeholder="Nome do evento"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                disabled={isLoading}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs">Descricao</Label>
              <Textarea
                id="description"
                placeholder="Descricao (opcional)"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={isLoading}
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="event_date" className="text-xs">Data *</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) =>
                    setFormData({ ...formData, event_date: e.target.value })
                  }
                  disabled={isLoading}
                  required
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="event_time" className="text-xs">Horario *</Label>
                <Input
                  id="event_time"
                  type="time"
                  value={formData.event_time}
                  onChange={(e) =>
                    setFormData({ ...formData, event_time: e.target.value })
                  }
                  disabled={isLoading}
                  required
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end_time" className="text-xs">Horário Final</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  disabled={isLoading}
                  className="h-9"
                />
                {formData.event_time && formData.end_time && (
                  <p className="text-[11px] text-muted-foreground">
                    Duração: {(() => {
                      const dur = calcDuration(formData.event_time, formData.end_time);
                      const h = Math.floor(dur / 60);
                      const m = dur % 60;
                      return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
                    })()}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="event_type" className="text-xs">Tipo</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, event_type: value })
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="location" className="text-xs">Local</Label>
                <Input
                  id="location"
                  placeholder="Endereco ou sala"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  disabled={isLoading}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Cor do evento</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  "#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#84cc16",
                  "#eab308", "#f97316", "#ef4444", "#ec4899", "#8b5cf6",
                  "#64748b", "#0ea5e9",
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all",
                      formData.color === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="meeting_link" className="text-xs">Link da Reuniao</Label>
              <Input
                id="meeting_link"
                type="url"
                placeholder="https://meet.google.com/..."
                value={formData.meeting_link}
                onChange={(e) =>
                  setFormData({ ...formData, meeting_link: e.target.value })
                }
                disabled={isLoading}
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="recurrence" className="text-xs">Recorrencia</Label>
                <Select
                  value={formData.recurrence}
                  onValueChange={(value: RecurrenceType) =>
                    setFormData({ ...formData, recurrence: value })
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrence !== "none" && (
                <div className="space-y-1">
                  <Label htmlFor="recurrence_end_date" className="text-xs">Data Limite</Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, recurrence_end_date: e.target.value })
                    }
                    disabled={isLoading}
                    className="h-9"
                  />
                </div>
              )}
            </div>

            {/* Participants Section */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Participantes
              </Label>
              {selectedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedParticipants.map(name => (
                    <Badge key={name} variant="secondary" className="gap-1 pr-1">
                      {name}
                      <button
                        type="button"
                        onClick={() => toggleParticipant(name)}
                        className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar participante..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <ScrollArea className="h-[150px] rounded-md border p-2">
                <div className="space-y-1">
                  {teamMembers
                    .filter(m => m.full_name.toLowerCase().includes(participantSearch.toLowerCase()))
                    .map(member => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={selectedParticipants.includes(member.full_name)}
                        onCheckedChange={() => toggleParticipant(member.full_name)}
                      />
                      {member.full_name}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                "Salvar"
              ) : (
                "Criar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
