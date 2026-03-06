import { useState } from "react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface Props {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear?: () => void;
}

const toYMD = (d: Date) => d.toISOString().split("T")[0];

type PresetKey = "hoje" | "ontem" | "hoje_ontem" | "7dias" | "14dias" | "28dias" | "30dias" | "esta_semana" | "semana_passada" | "este_mes" | "mes_passado";

const presets: { key: PresetKey; label: string; range: () => { from: Date; to: Date } }[] = [
  { key: "hoje", label: "Hoje", range: () => { const d = new Date(); return { from: d, to: d }; } },
  { key: "ontem", label: "Ontem", range: () => { const d = subDays(new Date(), 1); return { from: d, to: d }; } },
  { key: "hoje_ontem", label: "Hoje e ontem", range: () => ({ from: subDays(new Date(), 1), to: new Date() }) },
  { key: "7dias", label: "Últimos 7 dias", range: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { key: "14dias", label: "Últimos 14 dias", range: () => ({ from: subDays(new Date(), 13), to: new Date() }) },
  { key: "28dias", label: "Últimos 28 dias", range: () => ({ from: subDays(new Date(), 27), to: new Date() }) },
  { key: "30dias", label: "Últimos 30 dias", range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { key: "esta_semana", label: "Esta semana", range: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 0 }), to: new Date() }) },
  { key: "semana_passada", label: "Semana passada", range: () => { const s = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 }); return { from: s, to: endOfWeek(s, { weekStartsOn: 0 }) }; } },
  { key: "este_mes", label: "Este mês", range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { key: "mes_passado", label: "Mês passado", range: () => { const s = startOfMonth(subMonths(new Date(), 1)); return { from: s, to: endOfMonth(s) }; } },
];

export function DateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | null>(null);

  const dateRange: DateRange = {
    from: startDate ? new Date(startDate + "T00:00:00") : undefined,
    to: endDate ? new Date(endDate + "T00:00:00") : undefined,
  };

  const handlePreset = (preset: typeof presets[number]) => {
    const { from, to } = preset.range();
    onStartDateChange(toYMD(from));
    onEndDateChange(toYMD(to));
    setSelectedPreset(preset.key);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range?.from) onStartDateChange(toYMD(range.from));
    else onStartDateChange("");
    if (range?.to) onEndDateChange(toYMD(range.to));
    else if (range?.from) onEndDateChange(toYMD(range.from));
    else onEndDateChange("");
    setSelectedPreset(null);
  };

  const handleClear = () => {
    onStartDateChange("");
    onEndDateChange("");
    setSelectedPreset(null);
    onClear?.();
  };

  const displayText = startDate && endDate
    ? `${format(new Date(startDate + "T00:00:00"), "dd/MM/yyyy")} – ${format(new Date(endDate + "T00:00:00"), "dd/MM/yyyy")}`
    : startDate
    ? `A partir de ${format(new Date(startDate + "T00:00:00"), "dd/MM/yyyy")}`
    : "Selecionar período";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5 font-normal", !startDate && "text-muted-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
        <div className="flex max-h-[420px]">
          {/* Presets sidebar */}
          <div className="border-r p-2 space-y-0.5 min-w-[140px] overflow-y-auto">
            <p className="text-[11px] font-medium text-muted-foreground mb-1 px-1.5">Atalhos</p>
            {presets.map(p => (
              <button
                key={p.key}
                onClick={() => handlePreset(p)}
                className={cn(
                  "w-full text-left text-xs px-1.5 py-1 rounded transition-colors hover:bg-accent",
                  selectedPreset === p.key && "bg-primary/10 text-primary font-medium"
                )}
              >
                {p.label}
              </button>
            ))}
            {(startDate || endDate) && (
              <button
                onClick={handleClear}
                className="w-full text-left text-xs px-1.5 py-1 rounded text-destructive hover:bg-destructive/10 mt-1"
              >
                Limpar
              </button>
            )}
          </div>
          {/* Calendar */}
          <div className="p-2">
            <Calendar
              mode="range"
              selected={dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined}
              onSelect={handleCalendarSelect as any}
              numberOfMonths={2}
              locale={ptBR}
              defaultMonth={dateRange.from || subMonths(new Date(), 1)}
            />
            <div className="flex items-center justify-end px-1 pt-1.5 border-t mt-1 gap-2">
              <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="h-6 text-[11px] px-2" onClick={() => setOpen(false)}>
                OK
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
