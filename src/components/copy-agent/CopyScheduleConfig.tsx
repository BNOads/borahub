import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Clock, Calendar, CalendarRange } from "lucide-react";
import { format, addDays, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface ScheduleItem {
  id: string;
  date: Date;
  times: string[];
  isExtra?: boolean;
}

interface CopyScheduleConfigProps {
  schedule: ScheduleItem[];
  onChange: (schedule: ScheduleItem[]) => void;
}

export function CopyScheduleConfig({ schedule, onChange }: CopyScheduleConfigProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [defaultTime, setDefaultTime] = useState("08:00");

  // Generate schedule from date range
  const generateFromRange = () => {
    if (!startDate || !endDate) return;

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const newSchedule: ScheduleItem[] = days.map((date) => ({
      id: crypto.randomUUID(),
      date,
      times: [defaultTime],
      isExtra: false,
    }));

    // Keep any existing extra days that are outside the range
    const existingExtras = schedule.filter(
      (item) => item.isExtra && !days.some((d) => isSameDay(d, item.date))
    );

    onChange([...newSchedule, ...existingExtras]);
  };

  // Add an extra day (outside the main range)
  const addExtraDay = () => {
    const lastDate = schedule.length > 0
      ? addDays(schedule[schedule.length - 1].date, 1)
      : new Date();

    onChange([
      ...schedule,
      {
        id: crypto.randomUUID(),
        date: lastDate,
        times: ["08:00"],
        isExtra: true,
      },
    ]);
  };

  const removeDay = (id: string) => {
    onChange(schedule.filter((item) => item.id !== id));
  };

  const updateDate = (id: string, date: Date) => {
    onChange(
      schedule.map((item) =>
        item.id === id ? { ...item, date } : item
      )
    );
  };

  const addTime = (dayId: string) => {
    onChange(
      schedule.map((item) =>
        item.id === dayId
          ? { ...item, times: [...item.times, "12:00"] }
          : item
      )
    );
  };

  const removeTime = (dayId: string, timeIndex: number) => {
    onChange(
      schedule.map((item) =>
        item.id === dayId
          ? { ...item, times: item.times.filter((_, i) => i !== timeIndex) }
          : item
      )
    );
  };

  const updateTime = (dayId: string, timeIndex: number, time: string) => {
    onChange(
      schedule.map((item) =>
        item.id === dayId
          ? {
              ...item,
              times: item.times.map((t, i) => (i === timeIndex ? time : t)),
            }
          : item
      )
    );
  };

  // Sort schedule by date
  const sortedSchedule = [...schedule].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  return (
    <div className="space-y-5">
      {/* Date Range Selector */}
      <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold">Período do Cronograma</Label>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          {/* Start Date */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Data Inicial</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal rounded-lg",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    // If end date is before start date, reset it
                    if (date && endDate && date > endDate) {
                      setEndDate(undefined);
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Data Final</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal rounded-lg",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => startDate ? date < startDate : false}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Default Time + Generate Button */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Horário Padrão</Label>
            <div className="flex gap-2">
              <Input
                type="time"
                value={defaultTime}
                onChange={(e) => setDefaultTime(e.target.value)}
                className="h-10 w-24 rounded-lg"
              />
              <Button
                type="button"
                onClick={generateFromRange}
                disabled={!startDate || !endDate}
                className="flex-1 rounded-lg"
              >
                Gerar Período
              </Button>
            </div>
          </div>
        </div>

        {startDate && endDate && (
          <p className="text-xs text-muted-foreground">
            {eachDayOfInterval({ start: startDate, end: endDate }).length} dias serão criados
          </p>
        )}
      </div>

      {/* Schedule List */}
      {schedule.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Dias do Cronograma</Label>
            <span className="text-xs text-muted-foreground">
              {schedule.reduce((acc, item) => acc + item.times.length, 0)} copies
            </span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {sortedSchedule.map((item, dayIndex) => (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col sm:flex-row gap-3 p-3 rounded-xl border",
                  item.isExtra 
                    ? "bg-primary/5 border-primary/20" 
                    : "bg-muted/50 border-border"
                )}
              >
                <div className="flex items-center gap-2 min-w-[180px]">
                  <span className="text-xs font-medium text-muted-foreground w-14">
                    {format(item.date, "dd/MM", { locale: ptBR })}
                  </span>
                  {item.isExtra && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 border-primary/30 text-primary">
                      Extra
                    </Badge>
                  )}
                  <Input
                    type="date"
                    value={format(item.date, "yyyy-MM-dd")}
                    onChange={(e) => updateDate(item.id, new Date(e.target.value + "T12:00:00"))}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {item.times.map((time, timeIndex) => (
                    <div key={timeIndex} className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => updateTime(item.id, timeIndex, e.target.value)}
                        className="h-8 w-[85px] text-xs rounded-lg"
                      />
                      {item.times.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeTime(item.id, timeIndex)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1 rounded-lg px-2"
                    onClick={() => addTime(item.id)}
                  >
                    <Plus className="h-3 w-3" />
                    Horário
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeDay(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Extra Day Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 rounded-xl border-dashed"
        onClick={addExtraDay}
      >
        <Plus className="h-4 w-4" />
        Adicionar Dia Extra
      </Button>
    </div>
  );
}
