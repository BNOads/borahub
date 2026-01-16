import { useState } from "react";
import { useEvents, useDeleteEvent, type Event } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  MapPin,
  Video,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EventModal } from "@/components/events/EventModal";

const eventTypeColors: Record<string, string> = {
  reuniao: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  lancamento: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  deadline: "bg-red-500/20 text-red-400 border-red-500/30",
  evento: "bg-green-500/20 text-green-400 border-green-500/30",
  outro: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const eventTypeLabels: Record<string, string> = {
  reuniao: "Reuniao",
  lancamento: "Lancamento",
  deadline: "Deadline",
  evento: "Evento",
  outro: "Outro",
};

export default function Agenda() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: events = [], isLoading } = useEvents({
    search: searchTerm || undefined,
  });

  const deleteEvent = useDeleteEvent();

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleDelete = async (event: Event) => {
    if (!confirm(`Deseja excluir o evento "${event.title}"?`)) return;

    try {
      await deleteEvent.mutateAsync(event.id);
      toast({
        title: "Evento excluido",
        description: "O evento foi excluido com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: "Nao foi possivel excluir o evento.",
        variant: "destructive",
      });
    }
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  const isEventPast = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    return dateStr < today;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus eventos e compromissos
          </p>
        </div>
        <Button onClick={handleNewEvent} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[400px] bg-card/30 rounded-[2rem] border border-border">
          <div className="p-4 bg-accent/10 rounded-3xl mb-4">
            <Calendar className="h-12 w-12 text-accent/50" />
          </div>
          <h3 className="text-lg font-black text-muted-foreground mb-2">
            Nenhum evento encontrado
          </h3>
          <p className="text-sm text-muted-foreground/60 text-center max-w-md mb-4">
            {searchTerm
              ? "Nenhum evento corresponde a sua busca."
              : "Voce ainda nao tem eventos cadastrados."}
          </p>
          <Button onClick={handleNewEvent} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Criar primeiro evento
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Evento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow
                  key={event.id}
                  className={isEventPast(event.event_date) ? "opacity-50" : ""}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{event.title}</span>
                      {event.description && (
                        <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {event.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatTime(event.event_time)}</span>
                      {event.duration_minutes && (
                        <span className="text-muted-foreground text-sm">
                          ({event.duration_minutes}min)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.meeting_link ? (
                      <a
                        href={event.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-accent hover:underline"
                      >
                        <Video className="h-4 w-4" />
                        Online
                      </a>
                    ) : event.location ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">
                          {event.location}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        eventTypeColors[event.event_type || "outro"] ||
                        eventTypeColors.outro
                      }
                    >
                      {eventTypeLabels[event.event_type || "outro"] || "Outro"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(event)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(event)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EventModal
        open={showEventModal}
        onOpenChange={setShowEventModal}
        event={selectedEvent}
        onSuccess={() => setShowEventModal(false)}
      />
    </div>
  );
}
