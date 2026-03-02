import { useState, useMemo, useCallback } from "react";
import { DndContext, DragEndEvent, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Package, Mail, Phone, Clock, ExternalLink, Search, AlertTriangle, GripVertical, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBookShipments, useUpdateShipmentStage, useCreateBlingOrder, BOOK_STAGES, BookShipment, BookStage } from "@/hooks/useBookShipments";
import { differenceInHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";

function ShipmentCard({ shipment, onClick }: { shipment: BookShipment; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shipment.id,
    data: { shipment },
  });

  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1 } : undefined;

  const isDelayed = shipment.stage === "venda" && shipment.sale_date && differenceInHours(new Date(), new Date(shipment.sale_date)) > 72;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={`cursor-pointer hover:shadow-md transition-shadow ${isDelayed ? "border-destructive/50" : ""}`} onClick={onClick}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-1">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{shipment.buyer_name}</p>
              <p className="text-xs text-muted-foreground truncate">{shipment.product_name}</p>
            </div>
            <div {...listeners} className="cursor-grab p-1 text-muted-foreground hover:text-foreground">
              <GripVertical className="h-3 w-3" />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {shipment.sale_value && (
              <Badge variant="secondary" className="text-xs">R$ {shipment.sale_value.toFixed(2)}</Badge>
            )}
            {shipment.tracking_code && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Truck className="h-3 w-3" />{shipment.tracking_code}
              </Badge>
            )}
            {isDelayed && (
              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />Atrasado
              </Badge>
            )}
          </div>
          {shipment.sale_date && (
            <p className="text-xs text-muted-foreground">{format(new Date(shipment.sale_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KanbanColumn({ stage, shipments, onCardClick }: { stage: typeof BOOK_STAGES[number]; shipments: BookShipment[]; onCardClick: (s: BookShipment) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });

  return (
    <div ref={setNodeRef} className={`flex flex-col min-w-[260px] max-w-[300px] flex-1 rounded-lg border transition-colors ${isOver ? "bg-accent/20 border-primary" : "bg-muted/30"}`}>
      <div className={`px-3 py-2 rounded-t-lg flex items-center justify-between ${stage.color} text-white`}>
        <span className="text-sm font-medium">{stage.label}</span>
        <Badge variant="secondary" className="bg-white/20 text-white text-xs">{shipments.length}</Badge>
      </div>
      <ScrollArea className="flex-1 p-2 max-h-[65vh]">
        <div className="space-y-2">
          {shipments.map(s => (
            <ShipmentCard key={s.id} shipment={s} onClick={() => onCardClick(s)} />
          ))}
          {shipments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum envio</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function BookKanbanTab() {
  const { data: shipments = [] } = useBookShipments();
  const updateStage = useUpdateShipmentStage();
  const createBlingOrder = useCreateBlingOrder();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BookShipment | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [notes, setNotes] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(() => {
    if (!search) return shipments;
    const q = search.toLowerCase();
    return shipments.filter(s =>
      s.buyer_name.toLowerCase().includes(q) ||
      s.product_name.toLowerCase().includes(q) ||
      s.tracking_code?.toLowerCase().includes(q) ||
      s.buyer_email?.toLowerCase().includes(q)
    );
  }, [shipments, search]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const shipment = active.data.current?.shipment as BookShipment;
    const newStage = over.id as BookStage;
    if (!shipment || shipment.stage === newStage) return;
    updateStage.mutate({ shipmentId: shipment.id, newStage });
  }, [updateStage]);

  const handleManualMove = (newStage: BookStage) => {
    if (!selected) return;
    updateStage.mutate({
      shipmentId: selected.id,
      newStage,
      trackingCode: trackingCode || undefined,
      notes: notes || undefined,
    });
    setSelected(null);
    setTrackingCode("");
    setNotes("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, produto, rastreio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {BOOK_STAGES.map(stage => (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              shipments={filtered.filter(s => s.stage === stage.key)}
              onCardClick={setSelected}
            />
          ))}
        </div>
      </DndContext>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.buyer_name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Produto</Label>
                  <p className="font-medium">{selected.product_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor</Label>
                    <p>R$ {selected.sale_value?.toFixed(2) || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data da Venda</Label>
                    <p>{selected.sale_date ? format(new Date(selected.sale_date), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p>
                  </div>
                </div>
                {selected.buyer_email && (
                  <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{selected.buyer_email}</div>
                )}
                {selected.buyer_phone && (
                  <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{selected.buyer_phone}</div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Estágio Atual</Label>
                  <Badge className="mt-1">{BOOK_STAGES.find(s => s.key === selected.stage)?.label}</Badge>
                </div>

                {selected.bling_order_id && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Pedido Bling</Label>
                    <p className="font-mono text-sm">{selected.bling_order_id}</p>
                  </div>
                )}

                {selected.tracking_code && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Código de Rastreio</Label>
                    <p className="font-mono text-sm">{selected.tracking_code}</p>
                  </div>
                )}

                <hr />

                {/* Move actions */}
                <div className="space-y-3">
                  <Label>Mover para estágio</Label>
                  <Input placeholder="Código de rastreio (opcional)" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} />
                  <Textarea placeholder="Observações (opcional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
                  <div className="flex flex-wrap gap-2">
                    {BOOK_STAGES.filter(s => s.key !== selected.stage).map(stage => (
                      <Button key={stage.key} variant="outline" size="sm" onClick={() => handleManualMove(stage.key)} disabled={updateStage.isPending}>
                        {stage.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {selected.stage === "venda" && (
                  <Button onClick={() => { createBlingOrder.mutate(selected.id); setSelected(null); }} disabled={createBlingOrder.isPending} className="w-full">
                    <Package className="h-4 w-4 mr-2" />Criar Pedido no Bling
                  </Button>
                )}

                {selected.label_url && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={selected.label_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />Ver Etiqueta
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
