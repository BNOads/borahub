import { useState, useEffect } from "react";
import { Calendar, Plus, ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, ExternalLink, MapPin, Video, Clock, CalendarDays, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { EventModal, Event } from "@/components/events/EventModal";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, startOfYear, endOfYear, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "year" | "list";

export default function Agenda() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("month");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        fetchEvents();
    }, [currentDate, viewMode]);

    async function fetchEvents() {
        try {
            setLoading(true);
            let start: string, end: string;

            if (viewMode === "year" || viewMode === "list") {
                start = format(startOfYear(currentDate), "yyyy-MM-dd");
                end = format(endOfYear(currentDate), "yyyy-MM-dd");
            } else {
                start = format(startOfMonth(currentDate), "yyyy-MM-dd");
                end = format(endOfMonth(currentDate), "yyyy-MM-dd");
            }

            const { data, error } = await supabase
                .from("events")
                .select("*")
                .gte("event_date", start)
                .lte("event_date", end)
                .order("event_date", { ascending: true })
                .order("event_time", { ascending: true });

            if (error) throw error;
            setEvents(data || []);
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

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    };

    // Calendar helpers
    const days = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });

    const getEventsForDay = (date: Date) => {
        return events.filter(e => e.event_date === format(date, "yyyy-MM-dd"));
    };

    const firstDayOfMonth = startOfMonth(currentDate).getDay();
    const emptyDays = Array(firstDayOfMonth).fill(null);

    // Group events by month for year view
    const eventsByMonth = events.reduce((acc, event) => {
        const month = event.event_date.slice(0, 7);
        if (!acc[month]) acc[month] = [];
        acc[month].push(event);
        return acc;
    }, {} as Record<string, Event[]>);

    const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(currentDate.getFullYear(), i, 1);
        return {
            date,
            name: format(date, "MMMM", { locale: ptBR }),
            key: format(date, "yyyy-MM"),
        };
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Agenda</h1>
                    <p className="text-muted-foreground mt-1">
                        {viewMode === "year"
                            ? `Eventos de ${currentDate.getFullYear()}`
                            : viewMode === "list"
                                ? `Todos os eventos de ${currentDate.getFullYear()}`
                                : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex border rounded-xl overflow-hidden">
                        <button
                            onClick={() => setViewMode("month")}
                            className={cn(
                                "px-4 py-2 text-sm font-medium transition-colors",
                                viewMode === "month" ? "bg-accent text-accent-foreground" : "hover:bg-accent/10"
                            )}
                        >
                            Mes
                        </button>
                        <button
                            onClick={() => setViewMode("year")}
                            className={cn(
                                "px-4 py-2 text-sm font-medium transition-colors",
                                viewMode === "year" ? "bg-accent text-accent-foreground" : "hover:bg-accent/10"
                            )}
                        >
                            Ano
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "px-4 py-2 text-sm font-medium transition-colors",
                                viewMode === "list" ? "bg-accent text-accent-foreground" : "hover:bg-accent/10"
                            )}
                        >
                            Lista
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl"
                            onClick={() => setCurrentDate(viewMode === "month" ? subMonths(currentDate, 1) : new Date(currentDate.getFullYear() - 1, 0, 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-xl px-4"
                            onClick={() => setCurrentDate(new Date())}
                        >
                            Hoje
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl"
                            onClick={() => setCurrentDate(viewMode === "month" ? addMonths(currentDate, 1) : new Date(currentDate.getFullYear() + 1, 0, 1))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button
                        onClick={() => {
                            setSelectedEvent(null);
                            setSelectedDate(null);
                            setIsModalOpen(true);
                        }}
                        className="rounded-xl bg-accent hover:bg-accent/90"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Evento
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-7 gap-2">
                    {Array(35).fill(null).map((_, i) => (
                        <div key={i} className="aspect-square bg-accent/5 animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : viewMode === "month" ? (
                /* Month View */
                <Card className="p-6 rounded-[2rem]">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-2 mb-4">
                        {["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"].map(day => (
                            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-2">
                        {emptyDays.map((_, index) => (
                            <div key={`empty-${index}`} className="aspect-square" />
                        ))}
                        {days.map(day => {
                            const dayEvents = getEventsForDay(day);
                            const isCurrentDay = isToday(day);

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={cn(
                                        "aspect-square p-2 rounded-xl border transition-all hover:border-accent/50 cursor-pointer overflow-hidden",
                                        isCurrentDay && "border-accent bg-accent/5",
                                        !isCurrentDay && "border-border hover:bg-accent/5"
                                    )}
                                    onClick={() => {
                                        setSelectedDate(format(day, "yyyy-MM-dd"));
                                        setSelectedEvent(null);
                                        setIsModalOpen(true);
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={cn(
                                            "text-sm font-bold",
                                            isCurrentDay && "text-accent"
                                        )}>
                                            {format(day, "d")}
                                        </span>
                                        {dayEvents.length > 0 && (
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                {dayEvents.length}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {dayEvents.slice(0, 2).map(event => (
                                            <div
                                                key={event.id}
                                                className="text-[10px] px-1.5 py-0.5 rounded truncate"
                                                style={{ backgroundColor: event.color + "20", color: event.color }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedEvent(event);
                                                    setIsModalOpen(true);
                                                }}
                                            >
                                                {event.event_time.slice(0, 5)} {event.title}
                                            </div>
                                        ))}
                                        {dayEvents.length > 2 && (
                                            <div className="text-[10px] text-muted-foreground px-1">
                                                +{dayEvents.length - 2} mais
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            ) : viewMode === "year" ? (
                /* Year View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {months.map(month => {
                        const monthEvents = eventsByMonth[month.key] || [];
                        const monthDays = eachDayOfInterval({
                            start: startOfMonth(month.date),
                            end: endOfMonth(month.date),
                        });
                        const firstDay = startOfMonth(month.date).getDay();
                        const emptyMonthDays = Array(firstDay).fill(null);

                        return (
                            <Card
                                key={month.key}
                                className={cn(
                                    "p-4 rounded-2xl cursor-pointer transition-all hover:border-accent/50",
                                    isSameMonth(month.date, new Date()) && "border-accent"
                                )}
                                onClick={() => {
                                    setCurrentDate(month.date);
                                    setViewMode("month");
                                }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold capitalize">{month.name}</h3>
                                    {monthEvents.length > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                            {monthEvents.length}
                                        </Badge>
                                    )}
                                </div>

                                {/* Mini Calendar */}
                                <div className="grid grid-cols-7 gap-0.5 text-[10px]">
                                    {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                                        <div key={i} className="text-center text-muted-foreground">
                                            {d}
                                        </div>
                                    ))}
                                    {emptyMonthDays.map((_, i) => (
                                        <div key={`empty-${i}`} />
                                    ))}
                                    {monthDays.map(day => {
                                        const hasEvents = events.some(e => e.event_date === format(day, "yyyy-MM-dd"));
                                        const isCurrent = isToday(day);

                                        return (
                                            <div
                                                key={day.toISOString()}
                                                className={cn(
                                                    "text-center py-0.5 rounded",
                                                    isCurrent && "bg-accent text-accent-foreground font-bold",
                                                    hasEvents && !isCurrent && "bg-accent/20 font-medium"
                                                )}
                                            >
                                                {format(day, "d")}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Month Events Preview */}
                                {monthEvents.length > 0 && (
                                    <div className="mt-3 pt-3 border-t space-y-1">
                                        {monthEvents.slice(0, 3).map(event => (
                                            <div
                                                key={event.id}
                                                className="flex items-center gap-2 text-xs"
                                            >
                                                <div
                                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: event.color }}
                                                />
                                                <span className="text-muted-foreground">{format(new Date(event.event_date), "dd/MM")}</span>
                                                <span className="truncate">{event.title}</span>
                                            </div>
                                        ))}
                                        {monthEvents.length > 3 && (
                                            <div className="text-xs text-muted-foreground">
                                                +{monthEvents.length - 3} mais
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            ) : (
                /* List View */
                <Card className="p-6 rounded-[2rem]">
                    {events.length > 0 ? (
                        <div className="space-y-4">
                            {events.map((event, index) => {
                                const showDateHeader = index === 0 || events[index - 1].event_date !== event.event_date;

                                return (
                                    <div key={event.id}>
                                        {showDateHeader && (
                                            <div className="flex items-center gap-3 mb-3 mt-6 first:mt-0">
                                                <div className="text-lg font-bold">
                                                    {format(new Date(event.event_date), "dd")}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        {format(new Date(event.event_date), "EEEE", { locale: ptBR })}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(new Date(event.event_date), "MMMM yyyy", { locale: ptBR })}
                                                    </div>
                                                </div>
                                                {isToday(new Date(event.event_date)) && (
                                                    <Badge className="bg-accent text-accent-foreground">Hoje</Badge>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent/30 transition-all ml-8">
                                            <div
                                                className="w-1 h-16 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: event.color }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold">{event.title}</h3>
                                                    <Badge variant="outline" className="text-xs">
                                                        {event.event_type}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {event.event_time.slice(0, 5)} - {formatDuration(event.duration_minutes)}
                                                    </span>
                                                    {event.location && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="h-3.5 w-3.5" />
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
                                                            <Video className="h-3.5 w-3.5" />
                                                            Entrar na reuniao
                                                        </a>
                                                    )}
                                                </div>
                                                {event.description && (
                                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                                        {event.description}
                                                    </p>
                                                )}
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
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
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground">
                            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">Nenhum evento encontrado</p>
                            <p className="text-sm">Crie seu primeiro evento para comecar</p>
                            <Button
                                className="mt-4 rounded-xl bg-accent hover:bg-accent/90"
                                onClick={() => {
                                    setSelectedEvent(null);
                                    setSelectedDate(null);
                                    setIsModalOpen(true);
                                }}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Criar Evento
                            </Button>
                        </div>
                    )}
                </Card>
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
