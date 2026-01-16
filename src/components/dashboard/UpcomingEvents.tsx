import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUpcomingEvents, type Event } from "@/hooks/useEvents";
import { EventModal } from "@/components/events/EventModal";

type ViewMode = "list" | "calendar";

const eventTypeColors: Record<string, string> = {
  reuniao: "bg-blue-500/20 text-blue-400",
  lancamento: "bg-purple-500/20 text-purple-400",
  deadline: "bg-red-500/20 text-red-400",
  evento: "bg-green-500/20 text-green-400",
  outro: "bg-gray-500/20 text-gray-400",
};

export function UpcomingEvents() {
  const { data: events = [], isLoading } = useUpcomingEvents(10);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);

  const groupEventsByDate = (events: Event[]) => {
    const groups: { [key: string]: Event[] } = {};
    events.forEach((event) => {
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
    return events.filter((e) => e.event_date === format(date, "yyyy-MM-dd"));
  };

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return "Hoje";
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.getTime() === tomorrow.getTime()) {
      return "Amanha";
    }

    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  return (
    <div
      className="rounded-xl border border-border bg-card p-6 animate-slide-up"
      style={{ animationDelay: "0.3s" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            {viewMode === "list"
              ? "Proximos Eventos"
              : format(currentMonth, "MMMM yyyy", { locale: ptBR })}
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
                viewMode === "list"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/10"
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "calendar"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/10"
              )}
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>

          {viewMode === "calendar" && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => setShowEventModal(true)}
            className="rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>

          <Link
            to="/agenda"
            className="text-sm text-accent hover:underline font-medium ml-2"
          >
            Ver agenda
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : viewMode === "list" ? (
        events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum evento agendado</p>
            <p className="text-xs mt-1">
              Clique em "Novo" para criar seu primeiro evento
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {eventDates.map((date) => (
              <div key={date}>
                <p className="text-xs font-medium text-muted-foreground mb-2 capitalize">
                  {formatEventDate(date)}
                </p>
                <div className="space-y-2">
                  {groupedEvents[date].map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors"
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                          eventTypeColors[event.event_type || "outro"]?.replace(
                            "/20",
                            ""
                          ) || "bg-gray-500"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{event.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.event_time.slice(0, 5)}
                          </span>
                          {event.meeting_link ? (
                            <a
                              href={event.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-accent hover:underline"
                            >
                              <Video className="h-3 w-3" />
                              Online
                            </a>
                          ) : event.location ? (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "aspect-square p-1 rounded-lg text-center relative",
                  isToday(day) && "bg-accent/20",
                  dayEvents.length > 0 && "cursor-pointer hover:bg-accent/10"
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    isToday(day) && "font-bold text-accent"
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          eventTypeColors[e.event_type || "outro"]?.replace(
                            "/20",
                            ""
                          ) || "bg-gray-500"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <EventModal
        open={showEventModal}
        onOpenChange={setShowEventModal}
        onSuccess={() => setShowEventModal(false)}
      />
    </div>
  );
}
