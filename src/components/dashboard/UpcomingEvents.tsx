import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, Video, Plus, ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, ExternalLink, CalendarDays, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EventModal, Event } from "@/components/events/EventModal";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "calendar";

export function UpcomingEvents() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        fetchEvents();
    }, [currentMonth, viewMode]);

    async function fetchEvents() {
        try {
            setLoading(true);
            const today = format(new Date(), "yyyy-MM-dd");

            if (viewMode === "list") {
                // Para lista, buscar todos os proximos eventos a partir de hoje
                const { data, error } = await supabase
                    .from("events")
                    .select("*")
                    .gte("event_date", today)
                    .order("event_date", { ascending: true })
                    .order("event_time", { ascending: true })
                    .limit(20);

                if (error) throw error;
                setEvents(data || []);
            } else {
                // Para calendario, buscar eventos do mes atual
                const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
                const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

                const { data, error } = await supabase
                    .from("events")
                    .select("*")
                    .gte("event_date", start)
                    .lte("event_date", end)
                    .order("event_date", { ascending: true })
                    .order("event_time", { ascending: true });

                if (error) throw error;
                setEvents(data || []);
            }
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    }

    async function deleteEvent(id: string) {
        if (!confirm("Deseja excluir este evento?")) return;

        try {
            const { error } = await supabase.from("events").delete().eq("id", id);
            if (error) throw error;
            toast.success("Evento excluido!");
            fetchEvents();
        } catch (error: any) {
            toast.error("Erro ao excluir: " + error.message);
        }
    }

    // Agrupa eventos por data para exibicao
    const groupEventsByDate = (events: Event[]) => {
        const groups: { [key: string]: Event[] } = {};
        events.forEach(event => {
            if (!groups[event.event_date]) {
                groups[event.event_date] = [];
            }
            groups[event.event_date].push(event);
        });
        return groups;
    };

    const groupedEvents = groupEventsByDate(events);
    const eventDates = Object.keys(groupedEvents).sort();

    const formatDateLabel = (dateStr: string) => {
        const date = new Date(dateStr + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.getTime() === today.getTime()) return "Hoje";
        if (date.getTime() === tomorrow.getTime()) return "Amanha";
        return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    };

    const isEventNow = (event: Event) => {
        const now = new Date();
        const eventStart = new Date(`${event.event_date}T${event.event_time}`);
        const eventEnd = new Date(eventStart.getTime() + event.duration_minutes * 60000);
        return now >= eventStart && now <= eventEnd;
    };

    // Calendar helpers
    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    const getEventsForDay = (date: Date) => {
        return events.filter(e => e.event_date === format(date, "yyyy-MM-dd"));
    };

    const firstDayOfMonth = startOfMonth(currentMonth).getDay();
    const emptyDays = Array(firstDayOfMonth).fill(null);

    return (
        <div className="rounded-xl border border-border bg-card p-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">
                        {viewMode === "list" ? "Proximos Eventos" : format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                    </h2>
                    {viewMode === "list" && (
                        <Badge variant="outline" className="border-accent text-accent">
                            {events.length}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "p-2 transition-colors",
                                viewMode === "list" ? "bg-accent text-accent-foreground" : "hover:bg-accent/10"
                            )}
                        >
                            <List className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("calendar")}
                            className={cn(
                                "p-2 transition-colors",
                                viewMode === "calendar" ? "bg-accent text-accent-foreground" : "hover:bg-accent/10"
                            )}
                        >
                            <CalendarDays className="h-4 w-4" />
                        </button>
                    </div>

                    {viewMode === "calendar" && (
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    <Button
                        size="sm"
                        onClick={() => {
                            setSelectedEvent(null);
                            setSelectedDate(null);
                            setIsModalOpen(true);
                        }}
                        className="rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Novo
                    </Button>

                    <Link to="/agenda" className="text-sm text-accent hover:underline font-medium ml-2">
                        Ver agenda
                    </Link>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-accent/5 animate-pulse rounded-lg" />
                    ))}
                </div>
            ) : viewMode === "list" ? (
                /* List View - Proximos Eventos */
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {eventDates.length > 0 ? (
                        eventDates.map((dateStr) => (
                            <div key={dateStr}>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2 capitalize sticky top-0 bg-card py-1">
                                    {formatDateLabel(dateStr)}
                                </h3>
                                <div className="space-y-2">
                                    {groupedEvents[dateStr].map((event) => {
                                        const isNow = isEventNow(event);
                                        return (
                                            <div
                                                key={event.id}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-lg border transition-all",
                                                    isNow ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"
                                                )}
                                            >
                                                <div
                                                    className="w-1 h-12 rounded-full"
                                                    style={{ backgroundColor: event.color }}
                                                />
                                                <div className={cn(
                                                    "flex flex-col items-center justify-center min-w-[50px]",
                                                    isNow ? "text-accent" : "text-muted-foreground"
                                                )}>
                                                    <span className="text-xl font-bold">{event.event_time.slice(0, 5)}</span>
                                                    <span className="text-xs">{formatDuration(event.duration_minutes)}</span>
                                                </div>

                                                <div className="h-10 w-px bg-border" />

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-medium truncate">{event.title}</h3>
                                                        {isNow && (
                                                            <Badge className="bg-accent text-accent-foreground text-xs animate-pulse">
                                                                Agora
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                                        {event.location && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" />
                                                                {event.location}
                                                            </span>
                                                        )}
                                                        {event.meeting_link && (
                                                            <a
                                                                href={event.meeting_link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 text-accent hover:underline"
                                                            >
                                                                <Video className="h-3 w-3" />
                                                                Entrar
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl">
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedEvent(event);
                                                            setIsModalOpen(true);
                                                        }}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        {event.meeting_link && (
                                                            <DropdownMenuItem asChild>
                                                                <a href={event.meeting_link} target="_blank" rel="noopener noreferrer">
                                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                                    Abrir link
                                                                </a>
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => deleteEvent(event.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>Nenhum evento agendado</p>
                            <Button
                                variant="link"
                                className="text-accent"
                                onClick={() => {
                                    setSelectedEvent(null);
                                    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
                                    setIsModalOpen(true);
                                }}
                            >
                                Criar evento
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                /* Calendar View */
                <div>
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map(day => (
                            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                        {emptyDays.map((_, index) => (
                            <div key={`empty-${index}`} className="min-h-[80px]" />
                        ))}
                        {days.map(day => {
                            const dayEvents = getEventsForDay(day);
                            const isCurrentDay = isToday(day);

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={cn(
                                        "min-h-[80px] p-1 rounded-lg border transition-all relative",
                                        isCurrentDay && "border-accent bg-accent/5",
                                        !isCurrentDay && "border-border/50 hover:border-accent/30"
                                    )}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={cn(
                                            "text-sm font-medium",
                                            isCurrentDay && "text-accent"
                                        )}>
                                            {format(day, "d")}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setSelectedDate(format(day, "yyyy-MM-dd"));
                                                setSelectedEvent(null);
                                                setIsModalOpen(true);
                                            }}
                                            className="text-muted-foreground hover:text-accent p-0.5"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    {dayEvents.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                            {dayEvents.slice(0, 2).map((event) => (
                                                <button
                                                    key={event.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEvent(event);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="w-full text-left px-1 py-0.5 rounded text-[10px] truncate hover:opacity-80 transition-opacity"
                                                    style={{
                                                        backgroundColor: event.color + "20",
                                                        borderLeft: `2px solid ${event.color}`
                                                    }}
                                                    title={`${event.event_time.slice(0, 5)} - ${event.title}`}
                                                >
                                                    <span className="font-medium">{event.event_time.slice(0, 5)}</span>
                                                    <span className="ml-1 text-muted-foreground">{event.title}</span>
                                                </button>
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedDate(format(day, "yyyy-MM-dd"));
                                                        setSelectedEvent(null);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="w-full text-[10px] text-muted-foreground hover:text-accent text-center"
                                                >
                                                    +{dayEvents.length - 2} mais
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Events for selected month */}
                    {events.length > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-2 max-h-48 overflow-y-auto">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                Eventos do mes
                            </h4>
                            {events.map(event => (
                                <div
                                    key={event.id}
                                    className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-accent/5 cursor-pointer border border-transparent hover:border-accent/20 transition-all"
                                    onClick={() => {
                                        setSelectedEvent(event);
                                        setIsModalOpen(true);
                                    }}
                                >
                                    <div
                                        className="w-1 h-8 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: event.color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(event.event_date + "T00:00:00"), "dd/MM")}
                                            </span>
                                            <span className="text-xs font-medium text-accent">
                                                {event.event_time.slice(0, 5)}
                                            </span>
                                        </div>
                                        <span className="font-medium truncate block">{event.title}</span>
                                    </div>
                                    {event.meeting_link && (
                                        <Video className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <EventModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedEvent(null);
                    setSelectedDate(null);
                }}
                event={selectedEvent}
                onSuccess={fetchEvents}
                defaultDate={selectedDate || undefined}
            />
        </div>
    );
}
