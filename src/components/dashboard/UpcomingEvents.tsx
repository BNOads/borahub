import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, Video, Plus, ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, ExternalLink, CalendarDays, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "calendar";

// Interface local para eventos (tabela não existe no banco externo)
interface Event {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    event_time: string;
    duration_minutes: number;
    location: string | null;
    meeting_link: string | null;
    event_type: string;
    color: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export function UpcomingEvents() {
    const [events] = useState<Event[]>([]);
    const [loading] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [currentMonth, setCurrentMonth] = useState(new Date());

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
                        onClick={() => toast.info("Tabela events não configurada no banco externo")}
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

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-accent/5 animate-pulse rounded-lg" />
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum evento agendado</p>
                    <p className="text-xs mt-1">Configure a tabela events no banco de dados para usar esta funcionalidade</p>
                </div>
            )}
        </div>
    );
}
