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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EventModal } from "@/components/events/EventModal";
type ViewMode = "list" | "calendar";

const eventTypeColors: Record<string, { bg: string; text: string; dot: string }> = {
  reuniao: { bg: "bg-blue-500/10", text: "text-blue-500", dot: "bg-blue-500" },
  lancamento: { bg: "bg-purple-500/10", text: "text-purple-500", dot: "bg-purple-500" },
  deadline: { bg: "bg-red-500/10", text: "text-red-500", dot: "bg-red-500" },
  evento: { bg: "bg-green-500/10", text: "text-green-500", dot: "bg-green-500" },
  outro: { bg: "bg-gray-500/10", text: "text-gray-500", dot: "bg-gray-500" },
};

const eventTypeLabels: Record<string, string> = {
  reuniao: "Reunião",
  lancamento: "Lançamento",
  deadline: "Deadline",
  evento: "Evento",
  outro: "Outro",
};

export function UpcomingEvents() {
  const { data: events = [], isLoading } = useUpcomingEvents(3);
  const { profile } = useAuth();
  const currentUserName = profile?.full_name || "";
  // Fetch profiles for participant avatars
  const allParticipants = events.flatMap((e) => e.participants || []);
  const uniqueParticipants = [...new Set(allParticipants)];

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-avatars", uniqueParticipants.join(",")],
    queryFn: async () => {
      if (uniqueParticipants.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("full_name, display_name, avatar_url")
        .in("full_name", uniqueParticipants);
      return data || [];
    },
    enabled: uniqueParticipants.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const getProfileForName = (name: string) =>
    profiles.find((p) => p.full_name === name);

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
              ? "Próximos Eventos"
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
                  {groupedEvents[date].map((event) => {
                    const colors = eventTypeColors[event.event_type || "outro"] || eventTypeColors.outro;
                    const isUserParticipant = currentUserName && event.participants?.includes(currentUserName);
                    
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg transition-colors border-l-4",
                          colors.bg,
                          isUserParticipant && "ring-2 ring-accent/50 animate-pulse"
                        )}
                        style={{ borderLeftColor: colors.dot.includes("blue") ? "#3b82f6" : 
                                 colors.dot.includes("purple") ? "#a855f7" :
                                 colors.dot.includes("red") ? "#ef4444" :
                                 colors.dot.includes("green") ? "#22c55e" : "#6b7280" }}
                      >
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                            colors.dot
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{event.title}</p>
                            <Badge 
                              variant="secondary" 
                              className={cn("text-[10px] px-1.5 py-0", colors.bg, colors.text)}
                            >
                              {eventTypeLabels[event.event_type || "outro"]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                          {event.participants && event.participants.length > 0 && (
                            <TooltipProvider>
                              <div className="flex items-center gap-1 mt-1.5">
                                <div className="flex -space-x-2">
                                  {event.participants.slice(0, 4).map((name, i) => {
                                    const profile = getProfileForName(name);
                                    const initials = name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join("")
                                      .toUpperCase();
                                    return (
                                      <Tooltip key={i}>
                                        <TooltipTrigger asChild>
                                          <Avatar className="h-6 w-6 border-2 border-background">
                                            <AvatarImage src={profile?.avatar_url || ""} alt={name} />
                                            <AvatarFallback className="text-[9px] bg-muted">
                                              {initials}
                                            </AvatarFallback>
                                          </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">
                                          {name}
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                                {event.participants.length > 4 && (
                                  <span className="text-[10px] text-muted-foreground ml-1">
                                    +{event.participants.length - 4}
                                  </span>
                                )}
                              </div>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            <Link
              to="/agenda"
              className="block w-full text-center py-2 text-sm text-accent hover:underline font-medium"
            >
              Ver mais eventos →
            </Link>
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
                  "min-h-[70px] p-1 rounded-lg relative flex flex-col",
                  isToday(day) && "bg-accent/20",
                  dayEvents.length > 0 && "cursor-pointer hover:bg-accent/10"
                )}
              >
                <span
                  className={cn(
                    "text-sm text-center",
                    isToday(day) && "font-bold text-accent"
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    {dayEvents.slice(0, 2).map((e, i) => {
                      const colors = eventTypeColors[e.event_type || "outro"] || eventTypeColors.outro;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-1 px-1 py-0.5 rounded text-[9px] leading-tight",
                            colors.bg
                          )}
                          title={e.title}
                        >
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              colors.dot
                            )}
                          />
                          <span className={cn("break-words line-clamp-2", colors.text)}>
                            {e.title}
                          </span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-muted-foreground text-center">
                        +{dayEvents.length - 2}
                      </span>
                    )}
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
