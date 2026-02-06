import { useState } from "react";
import { Calendar, Plus, X, CalendarCheck, Pencil, Trash2, Loader2 } from "lucide-react";
import { FunnelData, getDateStatus, DateStatus } from "./types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFunnelEvents, useAddFunnelEvent, useRemoveFunnelEvent } from "@/hooks/useFunnelEvents";
import { useFunnelCustomDates, useAddFunnelCustomDate, useUpdateFunnelCustomDate, useDeleteFunnelCustomDate } from "@/hooks/useFunnelCustomDates";
import { useEvents } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FunnelKeyDatesProps {
  funnel: FunnelData;
  onUpdate?: () => void;
}

interface DateItem {
  key: string;
  name: string;
  date: string | null;
  status: DateStatus;
  color: string;
  bgColor: string;
}

const FIXED_DATE_KEYS = [
  { key: "captacao_start", defaultName: "Início Captação", color: "border-cyan-400 text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-50 dark:bg-cyan-900/20" },
  { key: "captacao_end", defaultName: "Fim Captação", color: "border-emerald-400 text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-900/20" },
  { key: "aquecimento_start", defaultName: "Início Aquecimento", color: "border-sky-400 text-sky-600 dark:text-sky-400", bgColor: "bg-sky-50 dark:bg-sky-900/20" },
  { key: "cpl_start", defaultName: "Início CPL", color: "border-orange-400 text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-900/20" },
  { key: "carrinho_start", defaultName: "Início Carrinho", color: "border-amber-400 text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "fechamento_date", defaultName: "Fechamento", color: "border-rose-400 text-rose-600 dark:text-rose-400", bgColor: "bg-rose-50 dark:bg-rose-900/20" },
];

const CUSTOM_COLOR_PRESETS = [
  { color: "border-purple-400 text-purple-600 dark:text-purple-400", bgColor: "bg-purple-50 dark:bg-purple-900/20", label: "Roxo" },
  { color: "border-indigo-400 text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-50 dark:bg-indigo-900/20", label: "Índigo" },
  { color: "border-teal-400 text-teal-600 dark:text-teal-400", bgColor: "bg-teal-50 dark:bg-teal-900/20", label: "Teal" },
  { color: "border-pink-400 text-pink-600 dark:text-pink-400", bgColor: "bg-pink-50 dark:bg-pink-900/20", label: "Rosa" },
  { color: "border-lime-400 text-lime-600 dark:text-lime-400", bgColor: "bg-lime-50 dark:bg-lime-900/20", label: "Lima" },
  { color: "border-fuchsia-400 text-fuchsia-600 dark:text-fuchsia-400", bgColor: "bg-fuchsia-50 dark:bg-fuchsia-900/20", label: "Fúcsia" },
];

export function FunnelKeyDates({ funnel, onUpdate }: FunnelKeyDatesProps) {
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isAddDateOpen, setIsAddDateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  const [newDateName, setNewDateName] = useState("");
  const [newDateValue, setNewDateValue] = useState("");
  const [newDateColorIdx, setNewDateColorIdx] = useState(0);

  const { data: funnelEvents = [], isLoading: loadingFunnelEvents } = useFunnelEvents(funnel.id);
  const { data: allEvents = [] } = useEvents();
  const addFunnelEvent = useAddFunnelEvent();
  const removeFunnelEvent = useRemoveFunnelEvent();

  const { data: customDates = [] } = useFunnelCustomDates(funnel.id);
  const addCustomDate = useAddFunnelCustomDate();
  const updateCustomDate = useUpdateFunnelCustomDate();
  const deleteCustomDate = useDeleteFunnelCustomDate();

  // Date labels from funnel (JSON column)
  const dateLabels: Record<string, string> = (funnel as any).date_labels || {};

  const availableEvents = allEvents.filter(
    (event) => !funnelEvents.some((fe) => fe.event_id === event.id)
  );

  const handleAddEvent = async () => {
    if (!selectedEventId) return;
    try {
      await addFunnelEvent.mutateAsync({ funnelId: funnel.id, eventId: selectedEventId });
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

  const handleSaveLabel = async (key: string) => {
    const newLabel = editLabelValue.trim();
    if (!newLabel) { setEditingLabel(null); return; }

    try {
      const updatedLabels = { ...dateLabels, [key]: newLabel };
      const { error } = await supabase
        .from("funnels")
        .update({ date_labels: updatedLabels })
        .eq("id", funnel.id);

      if (error) throw error;
      toast.success("Nome atualizado!");
      setEditingLabel(null);
      onUpdate?.();
    } catch {
      toast.error("Erro ao atualizar nome");
    }
  };

  const handleAddCustomDate = async () => {
    if (!newDateName.trim() || !newDateValue) return;
    const preset = CUSTOM_COLOR_PRESETS[newDateColorIdx % CUSTOM_COLOR_PRESETS.length];
    try {
      await addCustomDate.mutateAsync({
        funnel_id: funnel.id,
        name: newDateName.trim(),
        date: newDateValue,
        color: preset.color,
        bg_color: preset.bgColor,
        order_index: customDates.length,
      });
      toast.success("Data adicionada!");
      setNewDateName("");
      setNewDateValue("");
      setNewDateColorIdx((prev) => prev + 1);
      setIsAddDateOpen(false);
    } catch {
      toast.error("Erro ao adicionar data");
    }
  };

  const handleDeleteCustomDate = async (id: string) => {
    try {
      await deleteCustomDate.mutateAsync({ id, funnelId: funnel.id });
      toast.success("Data removida!");
    } catch {
      toast.error("Erro ao remover data");
    }
  };

  const getLabel = (key: string, defaultName: string) => dateLabels[key] || defaultName;

  const dates: DateItem[] = FIXED_DATE_KEYS.map((d) => ({
    key: d.key,
    name: getLabel(d.key, d.defaultName),
    date: (funnel as any)[d.key] || null,
    status: getDateStatus((funnel as any)[d.key] || null),
    color: d.color,
    bgColor: d.bgColor,
  }));

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const validDates = dates.filter((d) => d.date);

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Datas-Chave</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Adicionar data customizada */}
          <Dialog open={isAddDateOpen} onOpenChange={setIsAddDateOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-accent">
                <Plus className="h-4 w-4" />
                Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Data Importante</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome</label>
                  <Input
                    value={newDateName}
                    onChange={(e) => setNewDateName(e.target.value)}
                    placeholder="Ex: Início da Campanha"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data</label>
                  <Input
                    type="date"
                    value={newDateValue}
                    onChange={(e) => setNewDateValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cor</label>
                  <div className="flex gap-2 flex-wrap">
                    {CUSTOM_COLOR_PRESETS.map((preset, idx) => (
                      <button
                        key={preset.label}
                        onClick={() => setNewDateColorIdx(idx)}
                        className={cn(
                          "w-8 h-8 rounded-lg border-2 transition-all",
                          preset.bgColor,
                          preset.color,
                          newDateColorIdx === idx ? "ring-2 ring-accent ring-offset-2" : "opacity-60 hover:opacity-100"
                        )}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddCustomDate}
                    disabled={!newDateName.trim() || !newDateValue || addCustomDate.isPending}
                  >
                    {addCustomDate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Adicionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Associar evento da agenda */}
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
                  <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>
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

      {/* Static Funnel Dates (editable labels) */}
      {validDates.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {dates.map(
            (item) =>
              item.date && (
                <div
                  key={item.key}
                  className={cn(
                    "px-3 py-2 rounded-xl border-2 text-center group relative",
                    item.color,
                    item.bgColor,
                    item.status === "completed" && "opacity-60"
                  )}
                >
                  {/* Edit label button */}
                  <button
                    onClick={() => {
                      setEditingLabel(item.key);
                      setEditLabelValue(item.name);
                    }}
                    className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Renomear"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.status === "in_progress" && (
                      <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    )}
                    {editingLabel === item.key ? (
                      <Input
                        autoFocus
                        value={editLabelValue}
                        onChange={(e) => setEditLabelValue(e.target.value)}
                        onBlur={() => handleSaveLabel(item.key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveLabel(item.key);
                          if (e.key === "Escape") setEditingLabel(null);
                        }}
                        className="h-5 text-[10px] font-medium uppercase tracking-wide border-none p-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 w-24"
                      />
                    ) : (
                      <span className="text-[10px] font-medium uppercase tracking-wide">
                        {item.name}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold">{formatDate(item.date)}</span>
                </div>
              )
          )}
        </div>
      )}

      {/* Custom Dates */}
      {customDates.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {customDates.map((cd) => {
            const status = getDateStatus(cd.date);
            return (
              <div
                key={cd.id}
                className={cn(
                  "px-3 py-2 rounded-xl border-2 text-center group relative",
                  cd.color,
                  cd.bg_color,
                  status === "completed" && "opacity-60"
                )}
              >
                <button
                  onClick={() => handleDeleteCustomDate(cd.id)}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="flex items-center gap-1.5 mb-0.5">
                  {status === "in_progress" && (
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  )}
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    {cd.name}
                  </span>
                </div>
                <span className="text-sm font-bold">{formatDate(cd.date)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {validDates.length === 0 && funnelEvents.length === 0 && customDates.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma data definida</p>
        </div>
      )}
    </div>
  );
}
