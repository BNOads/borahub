import { useState, useMemo } from "react";
import { useEvents, useDeleteEvent, type Event } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Plus,
  Loader2,
  Repeat,
  Clock,
  MapPin,
  Video,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import { RecurrenceType, RECURRENCE_LABELS } from "@/types/tasks";
import { useToast } from "@/components/ui/use-toast";
import { EventModal } from "@/components/events/EventModal";
import { YearCalendar } from "@/components/calendar/YearCalendar";
import { cn } from "@/lib/utils";

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
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  const { data: events = [], isLoading } = useEvents();
  const deleteEvent = useDeleteEvent();

  // Eventos do dia selecionado
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((e) => e.event_date === selectedDate);
  }, [events, selectedDate]);

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
    } catch {
      toast({
        title: "Erro ao excluir",
        description: "Nao foi possivel excluir o evento.",
        variant: "destructive",
      });
    }
  };

  const handleNewEvent = (date?: string) => {
    setSelectedEvent(null);
    setDefaultDate(date);
    setShowEventModal(true);
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleEventClick = (event: Event) => {
    setSelectedDate(event.event_date);
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground mt-1">
            {events.length} evento(s) cadastrado(s)
          </p>
        </div>
        <Button onClick={() => handleNewEvent()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        {/* Calendario */}
        <div className="bg-card/30 rounded-2xl border p-4">
          <YearCalendar
            events={events}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        </div>

        {/* Painel lateral - eventos do dia */}
        <div className="bg-card rounded-2xl border">
          {selectedDate ? (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Eventos em</p>
                  <p className="font-semibold text-sm">{formatDate(selectedDate)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSelectedDate(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                {selectedDateEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum evento nesta data
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1"
                      onClick={() => handleNewEvent(selectedDate)}
                    >
                      <Plus className="h-3 w-3" />
                      Criar evento
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {selectedDateEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg border bg-background hover:border-accent/50 transition-colors cursor-pointer group"
                        onClick={() => handleEdit(event)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {event.title}
                              </span>
                              {event.recurrence && event.recurrence !== "none" && (
                                <Repeat className="h-3 w-3 text-accent shrink-0" />
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTime(event.event_time)}
                              {event.duration_minutes && (
                                <span>({event.duration_minutes}min)</span>
                              )}
                            </div>

                            {(event.location || event.meeting_link) && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                {event.meeting_link ? (
                                  <>
                                    <Video className="h-3 w-3" />
                                    <span>Online</span>
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{event.location}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0",
                                eventTypeColors[event.event_type || "outro"]
                              )}
                            >
                              {eventTypeLabels[event.event_type || "outro"]}
                            </Badge>

                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(event);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(event);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 gap-1"
                      onClick={() => handleNewEvent(selectedDate)}
                    >
                      <Plus className="h-3 w-3" />
                      Novo evento nesta data
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[460px] p-6 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">
                Clique em uma data no calendario para ver os eventos
              </p>
            </div>
          )}
        </div>
      </div>

      <EventModal
        open={showEventModal}
        onOpenChange={setShowEventModal}
        event={selectedEvent}
        onSuccess={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        defaultDate={defaultDate}
      />
    </div>
  );
}
