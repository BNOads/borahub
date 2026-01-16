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
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import {
  useCreateEvent,
  useUpdateEvent,
  type Event,
  type EventInsert,
} from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";

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

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: defaultDate || new Date().toISOString().split("T")[0],
    event_time: "09:00",
    duration_minutes: 60,
    location: "",
    meeting_link: "",
    event_type: "reuniao",
  });

  const isLoading = createEvent.isPending || updateEvent.isPending;
  const isEditing = !!event;

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || "",
        event_date: event.event_date,
        event_time: event.event_time.slice(0, 5),
        duration_minutes: event.duration_minutes || 60,
        location: event.location || "",
        meeting_link: event.meeting_link || "",
        event_type: event.event_type || "reuniao",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        event_date: defaultDate || new Date().toISOString().split("T")[0],
        event_time: "09:00",
        duration_minutes: 60,
        location: "",
        meeting_link: "",
        event_type: "reuniao",
      });
    }
  }, [event, defaultDate, open]);

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
        duration_minutes: formData.duration_minutes || null,
        location: formData.location.trim() || null,
        meeting_link: formData.meeting_link.trim() || null,
        event_type: formData.event_type,
        created_by: user?.id || null,
      };

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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Evento" : "Novo Evento"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Atualize as informacoes do evento."
                : "Preencha os dados para criar um novo evento."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titulo *</Label>
              <Input
                id="title"
                placeholder="Nome do evento"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                placeholder="Descricao do evento (opcional)"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date">Data *</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) =>
                    setFormData({ ...formData, event_date: e.target.value })
                  }
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_time">Horario *</Label>
                <Input
                  id="event_time"
                  type="time"
                  value={formData.event_time}
                  onChange={(e) =>
                    setFormData({ ...formData, event_time: e.target.value })
                  }
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duracao (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="60"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_minutes: parseInt(e.target.value) || 60,
                    })
                  }
                  disabled={isLoading}
                  min={5}
                  max={480}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_type">Tipo</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, event_type: value })
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                placeholder="Endereco ou sala"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_link">Link da Reuniao</Label>
              <Input
                id="meeting_link"
                type="url"
                placeholder="https://meet.google.com/..."
                value={formData.meeting_link}
                onChange={(e) =>
                  setFormData({ ...formData, meeting_link: e.target.value })
                }
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                "Salvar alteracoes"
              ) : (
                "Criar evento"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
