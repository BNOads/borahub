import { useState, useMemo } from "react";
import { useEvents, useDeleteEvent, type Event } from "@/hooks/useEvents";
import { useCalComEvents } from "@/hooks/useCalComEvents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  Star,
} from "lucide-react";
import { RecurrenceType, RECURRENCE_LABELS } from "@/types/tasks";
import { useToast } from "@/components/ui/use-toast";
import { EventModal } from "@/components/events/EventModal";
import { YearCalendar } from "@/components/calendar/YearCalendar";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Users } from "lucide-react";

type ViewMode = "year" | "month" | "week";

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
  const { isAdmin, profile } = useAuth();
  const currentUserName = profile?.display_name || profile?.full_name || '';
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>("year");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [favoriteDates, setFavoriteDates] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("agenda-favorite-dates") || "[]"); } catch { return []; }
  });

  const toggleFavoriteDate = (date: string) => {
    setFavoriteDates(prev => {
      const next = prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date];
      localStorage.setItem("agenda-favorite-dates", JSON.stringify(next));
      return next;
    });
  };

  const { data: internalEvents = [], isLoading } = useEvents();
  const { data: calComEvents = [] } = useCalComEvents();
  const deleteEvent = useDeleteEvent();

  // Merge internal + Cal.com events
  const events = useMemo(() => {
    const merged = [...internalEvents, ...calComEvents];
    return merged.sort((a, b) => {
      const dateCompare = a.event_date.localeCompare(b.event_date);
      if (dateCompare !== 0) return dateCompare;
      return a.event_time.localeCompare(b.event_time);
    });
  }, [internalEvents, calComEvents]);

  // Eventos do dia selecionado
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((e) => e.event_date === selectedDate);
  }, [events, selectedDate]);

  // Próximos eventos (a partir de hoje)
  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return events
      .filter((e) => e.event_date >= today)
      .sort((a, b) => {
        const dateCompare = a.event_date.localeCompare(b.event_date);
        if (dateCompare !== 0) return dateCompare;
        return a.event_time.localeCompare(b.event_time);
      })
      .slice(0, 10); // Mostrar até 10 próximos eventos
  }, [events]);

  const isCalComEvent = (event: Event) => (event as any).source === 'calcom';

  const handleEdit = (event: Event) => {
    if (isCalComEvent(event)) return; // Cal.com events are read-only
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
    if (!isCalComEvent(event)) {
      setSelectedEvent(event);
      setShowEventModal(true);
    }
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
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="bg-muted/50 p-1 rounded-lg"
          >
            <ToggleGroupItem value="week" aria-label="Semana" className="gap-1.5 px-3">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Semana</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label="Mês" className="gap-1.5 px-3">
              <CalendarRange className="h-4 w-4" />
              <span className="hidden sm:inline">Mês</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="year" aria-label="Ano" className="gap-1.5 px-3">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Ano</span>
            </ToggleGroupItem>
          </ToggleGroup>
          {isAdmin && (
            <Button onClick={() => handleNewEvent()} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Evento
            </Button>
          )}
        </div>
      </div>

      <div className={cn(
        "grid gap-6",
        viewMode === "week" ? "" : "lg:grid-cols-[1fr,320px]"
      )}>
        {/* Calendario */}
        <div className="bg-card/30 rounded-2xl border p-4">
          {viewMode === "year" && (
            <YearCalendar
              events={events}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              currentUserName={currentUserName}
              favoriteDates={favoriteDates}
            />
          )}
          {viewMode === "month" && (
            <MonthCalendar
              events={events}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              currentUserName={currentUserName}
              favoriteDates={favoriteDates}
              onToggleFavorite={toggleFavoriteDate}
            />
          )}
          {viewMode === "week" && (
            <WeekCalendar
              events={events}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              currentUserName={currentUserName}
            />
          )}
        </div>

        {/* Painel lateral - eventos do dia */}
        {viewMode !== "week" && (
        <div className="bg-card rounded-2xl border">
          {selectedDate ? (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Eventos em</p>
                  <p className="font-semibold text-sm">{formatDate(selectedDate)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleFavoriteDate(selectedDate)}
                    title={favoriteDates.includes(selectedDate) ? "Remover favorito" : "Favoritar data"}
                  >
                    <Star className={cn("h-4 w-4", favoriteDates.includes(selectedDate) ? "text-yellow-500 fill-yellow-500" : "")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedDate(null)}
                  >
                    <X className="h-4 w-4" />
                   </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px]">
                {selectedDateEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum evento nesta data
                    </p>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-1"
                        onClick={() => handleNewEvent(selectedDate)}
                      >
                        <Plus className="h-3 w-3" />
                        Criar evento
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {selectedDateEvents.map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "p-3 rounded-lg border bg-background hover:border-accent/50 transition-colors cursor-pointer group",
                          (event as any).participants?.includes(currentUserName) && "border-accent/60 bg-accent/5"
                        )}
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

                            {(event as any).participants?.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {(event as any).participants.join(", ")}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {isCalComEvent(event) && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-orange-500/20 text-orange-400 border-orange-500/30" variant="outline">
                                Cal.com
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0",
                                eventTypeColors[event.event_type || "outro"]
                              )}
                            >
                              {eventTypeLabels[event.event_type || "outro"]}
                            </Badge>

                            {!isCalComEvent(event) && (
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
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 gap-1"
                        onClick={() => handleNewEvent(selectedDate)}
                      >
                        <Plus className="h-3 w-3" />
                        Novo evento nesta data
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="h-[460px]">
              <div className="p-4 border-b">
                <p className="font-semibold text-sm">Próximos eventos</p>
                <p className="text-xs text-muted-foreground">{upcomingEvents.length} evento(s)</p>
              </div>
              <ScrollArea className="h-[400px]">
                {upcomingEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum evento futuro cadastrado
                    </p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "p-3 rounded-lg border bg-background hover:border-accent/50 transition-colors cursor-pointer group",
                          (event as any).participants?.includes(currentUserName) && "border-accent/60 bg-accent/5"
                        )}
                        onClick={() => {
                          setSelectedDate(event.event_date);
                          handleEdit(event);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-1 h-full min-h-[40px] rounded-full shrink-0"
                            style={{ backgroundColor: event.color || '#6366f1' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {event.title}
                              </span>
                              {isCalComEvent(event) && (
                                <Badge className="text-[9px] px-1 py-0 bg-orange-500/20 text-orange-400 border-orange-500/30 shrink-0" variant="outline">
                                  Cal.com
                                </Badge>
                              )}
                              {event.recurrence && event.recurrence !== "none" && (
                                <Repeat className="h-3 w-3 text-accent shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>
                                {new Date(event.event_date + "T00:00:00").toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "short"
                                })}
                              </span>
                              <span>•</span>
                              <Clock className="h-3 w-3" />
                              {formatTime(event.event_time)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
        )}
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
