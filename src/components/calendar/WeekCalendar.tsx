import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Event } from "@/hooks/useEvents";

interface WeekCalendarProps {
  events: Event[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDateClick?: (date: string) => void;
  onEventClick?: (event: Event) => void;
}

const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function WeekCalendar({ events, currentDate, onDateChange, onDateClick, onEventClick }: WeekCalendarProps) {
  const today = new Date().toISOString().split("T")[0];
  const weekStart = getWeekStart(currentDate);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach((event) => {
      const date = event.event_date;
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date)!.push(event);
    });
    return map;
  }, [events]);

  const prevWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-bold">
          {formatDateShort(weekStart)} - {formatDateShort(weekEnd)}
        </h2>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="grid grid-cols-7">
          {weekDays.map((date, i) => {
            const dateStr = date.toISOString().split("T")[0];
            const isToday = dateStr === today;
            const isPast = dateStr < today;
            const dayEvents = eventsByDate.get(dateStr) || [];

            return (
              <div key={i} className="border-r last:border-r-0">
                {/* Header */}
                <div
                  className={cn(
                    "p-2 text-center border-b bg-muted/30",
                    isToday && "bg-accent/20"
                  )}
                >
                  <div className="text-xs text-muted-foreground">{WEEKDAY_NAMES[i]}</div>
                  <div
                    className={cn(
                      "text-lg font-bold mt-0.5",
                      isToday && "text-accent",
                      isPast && !isToday && "text-muted-foreground/50"
                    )}
                  >
                    {date.getDate()}
                  </div>
                </div>

                {/* Events */}
                <div
                  onClick={() => onDateClick?.(dateStr)}
                  className={cn(
                    "min-h-[300px] p-1 cursor-pointer hover:bg-accent/5 transition-colors",
                    isPast && "bg-muted/5"
                  )}
                >
                  <div className="space-y-1">
                    {dayEvents
                      .sort((a, b) => a.event_time.localeCompare(b.event_time))
                      .map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          className="p-2 rounded text-white cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: event.color || '#6366f1' }}
                        >
                          <div className="text-[10px] opacity-80">
                            {event.event_time.slice(0, 5)}
                          </div>
                          <div className="text-xs font-medium truncate">
                            {event.title}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
