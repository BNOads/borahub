import { useState, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Phone, Mail, Star, Calendar, Clock, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { STAGES, StrategicLead, useUpdateLeadStage, useLeadHistory } from "@/hooks/useStrategicSession";

interface Props {
  sessionId: string;
  leads: StrategicLead[];
}

const stageLabels: Record<string, string> = {
  lead: "Lead",
  qualificado: "Qualificado",
  agendado: "Agendado",
  realizado: "Realizado",
  venda: "Venda",
};

const stageColors: Record<string, string> = {
  lead: "bg-blue-500",
  qualificado: "bg-purple-500",
  agendado: "bg-orange-500",
  realizado: "bg-emerald-500",
  venda: "bg-green-600",
};

const DATE_FIELD_NAMES = ["data", "date", "data de entrada", "data_entrada", "data de cadastro", "data_cadastro", "created_at", "timestamp", "data de inscrição", "data_inscricao", "data inscrição", "cadastro", "criado em", "criado_em"];

function getLeadEntryDate(lead: StrategicLead): { date: string; time: string } | null {
  const extra = lead.extra_data as Record<string, string> | null;
  if (!extra) return null;
  let raw: string | null = null;
  for (const key of DATE_FIELD_NAMES) {
    const val = extra[key] || extra[key.toLowerCase()];
    if (val && val.trim()) { raw = val.trim(); break; }
  }
  if (!raw) {
    for (const [k, v] of Object.entries(extra)) {
      if ((k.toLowerCase().includes("data") || k.toLowerCase().includes("date")) && v && v.trim()) { raw = v.trim(); break; }
    }
  }
  if (!raw) return null;
  return formatEntryDate(raw);
}

function formatEntryDate(raw: string): { date: string; time: string } {
  // Try parsing as Date object first
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${min}` };
  }
  // Try dd/mm/yyyy or dd/mm/yyyy hh:mm patterns
  const match = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (match) {
    const dd = match[1].padStart(2, '0');
    const mm = match[2].padStart(2, '0');
    const yyyy = match[3].length === 2 ? `20${match[3]}` : match[3];
    const time = match[4] ? `${match[4].padStart(2, '0')}:${match[5]}` : '';
    return { date: `${dd}/${mm}/${yyyy}`, time };
  }
  return { date: raw, time: '' };
}

function getLeadEntryTimestamp(lead: StrategicLead): number {
  const extra = lead.extra_data as Record<string, string> | null;
  if (!extra) return 0;
  let raw: string | null = null;
  for (const key of DATE_FIELD_NAMES) {
    const val = extra[key] || extra[key.toLowerCase()];
    if (val && val.trim()) { raw = val.trim(); break; }
  }
  if (!raw) {
    for (const [k, v] of Object.entries(extra)) {
      if ((k.toLowerCase().includes("data") || k.toLowerCase().includes("date")) && v && v.trim()) { raw = v.trim(); break; }
    }
  }
  if (!raw) return 0;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function DroppableColumn({ stage, children, count }: { stage: string; children: React.ReactNode; count?: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={`flex-1 min-w-[220px] rounded-lg border p-2 transition-colors ${isOver ? "bg-accent/20 border-primary" : "bg-muted/30 border-border"}`}>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2.5 h-2.5 rounded-full ${stageColors[stage]}`} />
        <span className="text-sm font-medium">{stageLabels[stage]}</span>
        {count !== undefined && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{count}</Badge>}
      </div>
      <div className="space-y-2 min-h-[100px]">{children}</div>
    </div>
  );
}

function DraggableLeadCard({ lead, onClick }: { lead: StrategicLead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id, data: { lead } });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 } : undefined;

  const entryDate = getLeadEntryDate(lead);

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card className="cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow" onClick={e => { e.stopPropagation(); onClick(); }}>
        <CardContent className="p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium truncate">{lead.name}</span>
            {lead.is_qualified && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
          </div>
          {lead.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</p>}
          <div className="flex flex-wrap gap-1">
            {entryDate && <Badge variant="secondary" className="text-[10px] h-5"><Clock className="h-2.5 w-2.5 mr-0.5" />{entryDate.date}{entryDate.time ? ` ${entryDate.time}` : ''}</Badge>}
            {lead.utm_source && <Badge variant="outline" className="text-[10px] h-5">{lead.utm_source}</Badge>}
            {lead.utm_medium && <Badge variant="outline" className="text-[10px] h-5">{lead.utm_medium}</Badge>}
            {lead.utm_campaign && <Badge variant="outline" className="text-[10px] h-5">{lead.utm_campaign}</Badge>}
            {lead.utm_content && <Badge variant="outline" className="text-[10px] h-5">{lead.utm_content}</Badge>}
          </div>
          {lead.meeting_date && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Reunião: {new Date(lead.meeting_date).toLocaleDateString("pt-BR")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const LEADS_PER_PAGE = 50;

export function StrategicCRMTab({ sessionId, leads }: Props) {
  const [selectedLead, setSelectedLead] = useState<StrategicLead | null>(null);
  const [search, setSearch] = useState("");
  const [stagePages, setStagePages] = useState<Record<string, number>>({});
  const updateStage = useUpdateLeadStage();
  const { data: history = [] } = useLeadHistory(selectedLead?.id);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(l => {
      const extra = l.extra_data as Record<string, string> | null;
      const extraMatch = extra ? Object.values(extra).some(v => v && String(v).toLowerCase().includes(q)) : false;
      return l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.utm_source?.toLowerCase().includes(q) ||
        l.utm_campaign?.toLowerCase().includes(q) ||
        extraMatch;
    });
  }, [leads, search]);

  const leadsByStage = useMemo(() => {
    const map: Record<string, StrategicLead[]> = {};
    STAGES.forEach(s => { map[s] = []; });
    filteredLeads.forEach(l => { if (map[l.stage]) map[l.stage].push(l); });
    Object.values(map).forEach(arr => arr.sort((a, b) => getLeadEntryTimestamp(b) - getLeadEntryTimestamp(a)));
    return map;
  }, [filteredLeads]);

  const getPage = (stage: string) => stagePages[stage] || 0;
  const setPage = (stage: string, page: number) => setStagePages(prev => ({ ...prev, [stage]: page }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const lead = leads.find(l => l.id === active.id);
    if (!lead) return;
    const newStage = over.id as string;
    if (newStage === lead.stage) return;
    updateStage.mutate({ leadId: lead.id, newStage, previousStage: lead.stage });
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar leads..."
          value={search}
          onChange={e => { setSearch(e.target.value); setStagePages({}); }}
          className="pl-9 h-9"
        />
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const all = leadsByStage[stage];
            const page = getPage(stage);
            const totalPages = Math.ceil(all.length / LEADS_PER_PAGE);
            const paginated = all.slice(page * LEADS_PER_PAGE, (page + 1) * LEADS_PER_PAGE);
            return (
              <DroppableColumn key={stage} stage={stage} count={all.length}>
                {paginated.map(lead => (
                  <DraggableLeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
                ))}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 px-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page === 0} onClick={() => setPage(stage, page - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-[10px] text-muted-foreground">{page + 1}/{totalPages}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page >= totalPages - 1} onClick={() => setPage(stage, page + 1)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </DroppableColumn>
            );
          })}
        </div>
      </DndContext>

      <Sheet open={!!selectedLead} onOpenChange={open => !open && setSelectedLead(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLead.name}</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Estágio:</span> <Badge>{stageLabels[selectedLead.stage]}</Badge></div>
                    {selectedLead.email && <div><span className="text-muted-foreground">Email:</span> <p>{selectedLead.email}</p></div>}
                    {selectedLead.phone && <div><span className="text-muted-foreground">Telefone:</span> <p>{selectedLead.phone}</p></div>}
                    {selectedLead.sale_value && <div><span className="text-muted-foreground">Valor venda:</span> <p>R$ {selectedLead.sale_value.toLocaleString("pt-BR")}</p></div>}
                    {selectedLead.meeting_date && <div><span className="text-muted-foreground">Reunião:</span> <p>{new Date(selectedLead.meeting_date).toLocaleString("pt-BR")}</p></div>}
                    {(() => { const d = getLeadEntryDate(selectedLead); return d ? <div><span className="text-muted-foreground">Entrada:</span> <p>{d.date}{d.time ? ` às ${d.time}` : ''}</p></div> : null; })()}
                  </div>

                  {/* UTMs completas */}
                  {(selectedLead.utm_source || selectedLead.utm_medium || selectedLead.utm_campaign || selectedLead.utm_content) && (
                    <div>
                      <p className="text-sm font-medium mb-1.5">UTMs</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {selectedLead.utm_source && <div><span className="text-muted-foreground">Source:</span> <span className="ml-1">{selectedLead.utm_source}</span></div>}
                        {selectedLead.utm_medium && <div><span className="text-muted-foreground">Medium:</span> <span className="ml-1">{selectedLead.utm_medium}</span></div>}
                        {selectedLead.utm_campaign && <div><span className="text-muted-foreground">Campaign:</span> <span className="ml-1">{selectedLead.utm_campaign}</span></div>}
                        {selectedLead.utm_content && <div><span className="text-muted-foreground">Content:</span> <span className="ml-1">{selectedLead.utm_content}</span></div>}
                      </div>
                    </div>
                  )}

                  {selectedLead.is_qualified && (
                    <Badge className="bg-amber-500 text-white"><Star className="h-3 w-3 mr-1" />Qualificado</Badge>
                  )}
                  {selectedLead.meeting_notes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Anotações da reunião</p>
                      <p className="text-sm text-muted-foreground">{selectedLead.meeting_notes}</p>
                    </div>
                  )}

                  {/* Respostas da planilha */}
                  {selectedLead.extra_data && typeof selectedLead.extra_data === 'object' && Object.keys(selectedLead.extra_data as Record<string, string>).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Respostas da Planilha</p>
                      <div className="space-y-1.5 rounded-md border p-3 bg-muted/30">
                        {Object.entries(selectedLead.extra_data as Record<string, string>)
                          .filter(([, value]) => value && String(value).trim() !== '')
                          .map(([key, value]) => (
                            <div key={key} className="flex flex-col text-xs">
                              <span className="font-medium text-muted-foreground capitalize">{key}</span>
                              <span className="break-words">{String(value)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium mb-2">Histórico</p>
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem movimentações</p>
                    ) : (
                      <div className="space-y-2">
                        {history.map(h => (
                          <div key={h.id} className="flex items-center gap-2 text-xs border-l-2 border-primary pl-3 py-1">
                            <span className="text-muted-foreground">{new Date(h.changed_at).toLocaleString("pt-BR")}</span>
                            <span>{stageLabels[h.previous_stage || ''] || '—'} → {stageLabels[h.new_stage]}</span>
                            {h.changed_by_name && <span className="text-muted-foreground">por {h.changed_by_name}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
