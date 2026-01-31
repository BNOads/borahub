import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Clock } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ScheduleItem {
  id: string;
  date: Date;
  times: string[];
}

interface CopyScheduleConfigProps {
  schedule: ScheduleItem[];
  onChange: (schedule: ScheduleItem[]) => void;
}

export function CopyScheduleConfig({ schedule, onChange }: CopyScheduleConfigProps) {
  const addDay = () => {
    const lastDate = schedule.length > 0 
      ? addDays(schedule[schedule.length - 1].date, 1)
      : new Date();
    
    onChange([
      ...schedule,
      {
        id: crypto.randomUUID(),
        date: lastDate,
        times: ["08:00"],
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

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Cronograma de Envios</Label>
      
      <div className="space-y-3">
        {schedule.map((item, dayIndex) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/50 rounded-xl border border-border"
          >
            <div className="flex items-center gap-2 min-w-[160px]">
              <span className="text-sm font-medium text-muted-foreground w-12">
                Dia {dayIndex + 1}
              </span>
              <Input
                type="date"
                value={format(item.date, "yyyy-MM-dd")}
                onChange={(e) => updateDate(item.id, new Date(e.target.value + "T12:00:00"))}
                className="h-9 rounded-lg"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {item.times.map((time, timeIndex) => (
                <div key={timeIndex} className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => updateTime(item.id, timeIndex, e.target.value)}
                    className="h-9 w-24 rounded-lg"
                  />
                  {item.times.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
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
                className="h-8 text-xs gap-1 rounded-lg"
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
              className="h-9 w-9 shrink-0"
              onClick={() => removeDay(item.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 rounded-xl"
        onClick={addDay}
      >
        <Plus className="h-4 w-4" />
        Adicionar Dia
      </Button>

      {schedule.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Total: {schedule.reduce((acc, item) => acc + item.times.length, 0)} copies serão geradas
        </p>
      )}
    </div>
  );
}
