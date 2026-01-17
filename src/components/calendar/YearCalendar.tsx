import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Event } from "@/hooks/useEvents";

interface YearCalendarProps {
  events: Event[];
  onDateClick?: (date: string) => void;
  onEventClick?: (event: Event) => void;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAY_NAMES = ["D", "S", "T", "Q", "Q", "S", "S"];

const eventTypeColors: Record<string, string> = {
  reuniao: "bg-blue-500",
  lancamento: "bg-purple-500",
  deadline: "bg-red-500",
  evento: "bg-green-500",
  outro: "bg-gray-500",
};

export function YearCalendar({ events, onDateClick, onEventClick }: YearCalendarProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const today = new Date().toISOString().split("T")[0];

  // Agrupar eventos por data
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

  const renderMonth = (monthIndex: number) => {
    const daysInMonth = getDaysInMonth(year, monthIndex);
    const firstDay = getFirstDayOfMonth(year, monthIndex);
    const days: (number | null)[] = [];

    // Preencher com dias vazios ate o primeiro dia
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Adicionar os dias do mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return (
      <div key={monthIndex} className="bg-card rounded-lg border p-2">
        <h3 className="text-xs font-semibold text-center mb-1 text-muted-foreground">
          {MONTH_NAMES[monthIndex]}
        </h3>
        <div className="grid grid-cols-7 gap-px">
          {WEEKDAY_NAMES.map((day, i) => (
            <div key={i} className="text-[9px] text-center text-muted-foreground/60 py-0.5">
              {day}
            </div>
          ))}
          {days.map((day, i) => {
            if (day === null) {
              return <div key={i} className="aspect-square" />;
            }

            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventsByDate.get(dateStr) || [];
            const hasEvents = dayEvents.length > 0;
            const isToday = dateStr === today;
            const isPast = dateStr < today;

            return (
              <button
                key={i}
                onClick={() => {
                  if (hasEvents && dayEvents.length === 1) {
                    onEventClick?.(dayEvents[0]);
                  } else {
                    onDateClick?.(dateStr);
                  }
                }}
                className={cn(
                  "aspect-square flex items-center justify-center text-[10px] rounded-sm relative transition-colors",
                  isToday && "bg-accent text-accent-foreground font-bold",
                  !isToday && isPast && "text-muted-foreground/40",
                  !isToday && !isPast && "hover:bg-accent/20",
                  hasEvents && !isToday && "font-semibold"
                )}
                title={hasEvents ? `${dayEvents.length} evento(s)` : undefined}
              >
                {day}
                {hasEvents && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-px">
                    {dayEvents.slice(0, 3).map((event, idx) => (
                      <div
                        key={idx}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: event.color || '#6366f1' }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setYear(year - 1)}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {year - 1}
        </Button>
        <h2 className="text-xl font-bold">{year}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setYear(year + 1)}
          className="gap-1"
        >
          {year + 1}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          Reuniao
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          Lancamento
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          Deadline
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          Evento
        </div>
      </div>
    </div>
  );
}
