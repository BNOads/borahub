import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Event } from "@/hooks/useEvents";

interface MonthCalendarProps {
  events: Event[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDateClick?: (date: string) => void;
  onEventClick?: (event: Event) => void;
}

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function MonthCalendar({ events, currentDate, onDateChange, onDateClick, onEventClick }: MonthCalendarProps) {
  const today = new Date().toISOString().split("T")[0];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const prevMonth = () => {
    onDateChange(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    onDateChange(new Date(year, month + 1, 1));
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={prevMonth} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">
          {MONTH_NAMES[month]} {year}
        </h2>
        <Button variant="outline" size="sm" onClick={nextMonth} className="gap-1">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {WEEKDAY_NAMES.map((day, i) => (
            <div key={i} className="text-xs font-medium text-center text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (day === null) {
              return <div key={i} className="min-h-[100px] border-r border-b last:border-r-0 bg-muted/10" />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventsByDate.get(dateStr) || [];
            const isToday = dateStr === today;
            const isPast = dateStr < today;

            return (
              <div
                key={i}
                onClick={() => onDateClick?.(dateStr)}
                className={cn(
                  "min-h-[100px] border-r border-b last:border-r-0 p-1 cursor-pointer hover:bg-accent/10 transition-colors",
                  isPast && "bg-muted/5"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                      isToday && "bg-accent text-accent-foreground",
                      isPast && !isToday && "text-muted-foreground/50"
                    )}
                  >
                    {day}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: event.color || '#6366f1' }}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayEvents.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
