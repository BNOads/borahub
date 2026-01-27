import { useState } from "react";
import { Calendar, Plus, X, CalendarCheck } from "lucide-react";
import { FunnelData, getDateStatus, DateStatus } from "./types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFunnelEvents, useAddFunnelEvent, useRemoveFunnelEvent } from "@/hooks/useFunnelEvents";
import { useEvents } from "@/hooks/useEvents";
import { toast } from "sonner";

interface FunnelKeyDatesProps {
  funnel: FunnelData;
}

interface DateItem {
  name: string;
  date: string | null;
  status: DateStatus;
  color: string;
  bgColor: string;
}

export function FunnelKeyDates({ funnel }: FunnelKeyDatesProps) {
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const { data: funnelEvents = [], isLoading: loadingFunnelEvents } = useFunnelEvents(funnel.id);
  const { data: allEvents = [] } = useEvents();
  const addFunnelEvent = useAddFunnelEvent();
  const removeFunnelEvent = useRemoveFunnelEvent();

  // Filter out already associated events
  const availableEvents = allEvents.filter(
    (event) => !funnelEvents.some((fe) => fe.event_id === event.id)
  );

  const handleAddEvent = async () => {
    if (!selectedEventId) return;

    try {
      await addFunnelEvent.mutateAsync({
        funnelId: funnel.id,
        eventId: selectedEventId,
      });
      toast.success("Evento associado ao funil!");
      setSelectedEventId("");
      setIsAddEventOpen(false);
    } catch (error: any) {
      toast.error("Erro ao associar evento: " + error.message);
    }
  };

  const handleRemoveEvent = async (id: string) => {
    try {
      await removeFunnelEvent.mutateAsync({ id, funnelId: funnel.id });
      toast.success("Evento removido do funil!");
    } catch (error: any) {
      toast.error("Erro ao remover evento: " + error.message);
    }
  };

  const dates: DateItem[] = [
    { 
      name: "Início Captação", 
      date: funnel.captacao_start || null, 
      status: getDateStatus(funnel.captacao_start || null),
      color: "border-cyan-400 text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20"
    },
    { 
      name: "Fim Captação", 
      date: funnel.captacao_end || null, 
      status: getDateStatus(funnel.captacao_end || null),
      color: "border-emerald-400 text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20"
    },
    { 
      name: "Início Aquecimento", 
      date: funnel.aquecimento_start || null, 
      status: getDateStatus(funnel.aquecimento_start || null),
      color: "border-sky-400 text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-50 dark:bg-sky-900/20"
    },
    { 
      name: "Início CPL", 
      date: funnel.cpl_start || null, 
      status: getDateStatus(funnel.cpl_start || null),
      color: "border-orange-400 text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20"
    },
    { 
      name: "Início Carrinho", 
      date: funnel.carrinho_start || null, 
      status: getDateStatus(funnel.carrinho_start || null),
      color: "border-amber-400 text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20"
    },
    { 
      name: "Fechamento", 
      date: funnel.fechamento_date || null, 
      status: getDateStatus(funnel.fechamento_date || null),
      color: "border-rose-400 text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-900/20"
    },
  ];

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const validDates = dates.filter(d => d.date);

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Datas-Chave</span>
        </div>
        <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-accent">
              <Plus className="h-4 w-4" />
              Evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Associar Evento da Agenda</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um evento..." />
                </SelectTrigger>
                <SelectContent>
                  {availableEvents.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Nenhum evento disponível
                    </div>
                  ) : (
                    availableEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center gap-2">
                          <span>{event.title}</span>
                          <span className="text-xs text-muted-foreground">
                            ({formatDate(event.event_date)})
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddEventOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddEvent}
                  disabled={!selectedEventId || addFunnelEvent.isPending}
                >
                  Associar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Associated Events from Calendar */}
      {funnelEvents.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Eventos da Agenda
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {funnelEvents.map((fe) => {
              const event = fe.event;
              if (!event) return null;
              const eventStatus = getDateStatus(event.event_date);
              
              return (
                <div
                  key={fe.id}
                  className={cn(
                    "px-3 py-2 rounded-xl border-2 group relative",
                    "border-accent/50 text-accent",
                    "bg-accent/5",
                    eventStatus === "completed" && "opacity-60"
                  )}
                >
                  <button
                    onClick={() => handleRemoveEvent(fe.id)}
                    className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {eventStatus === "in_progress" && (
                      <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    )}
                    <span className="text-[10px] font-medium uppercase tracking-wide">
                      {event.event_type || "Evento"}
                    </span>
                  </div>
                  <span className="text-sm font-bold block">{event.title}</span>
                  <span className="text-xs opacity-75">
                    {formatDate(event.event_date)} {event.event_time?.slice(0, 5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Static Funnel Dates */}
      {validDates.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {dates.map((item) => item.date && (
            <div
              key={item.name}
              className={cn(
                "px-3 py-2 rounded-xl border-2 text-center",
                item.color,
                item.bgColor,
                item.status === "completed" && "opacity-60"
              )}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                {item.status === "in_progress" && (
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                )}
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  {item.name}
                </span>
              </div>
              <span className="text-sm font-bold">
                {formatDate(item.date)}
              </span>
            </div>
          ))}
        </div>
      ) : funnelEvents.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma data definida</p>
        </div>
      ) : null}
    </div>
  );
}
