import { useState, useMemo, useCallback } from "react";
import { DndContext, DragEndEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Phone, Mail, Calendar, Clock, Search, ChevronLeft, ChevronRight, Filter, X, Trash2, Save, TrendingUp, GraduationCap } from "lucide-react";
import { computeLeadScore, type LeadScore } from "@/lib/leadScoring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { STAGES, StrategicLead, useUpdateLeadStage, useUpdateLead, useDeleteLead, useLeadHistory, useSalesLookup, getStudentInfo, type StudentInfo } from "@/hooks/useStrategicSession";

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

const UTM_FIELD_NAMES: Record<string, string[]> = {
  utm_source: ["utm_source", "utm source", "fonte", "source"],
  utm_medium: ["utm_medium", "utm medium", "medium", "mídia", "midia"],
  utm_campaign: ["utm_campaign", "utm campaign", "campanha", "campaign"],
  utm_content: ["utm_content", "utm content", "content", "conteúdo", "conteudo"],
  utm_term: ["utm_term", "utm term", "term", "termo"],
};

const UTM_LABELS: Record<string, string> = {
  utm_source: "Origem",
  utm_medium: "Público",
  utm_campaign: "Campanha",
  utm_content: "Criativo",
  utm_term: "Tráfego",
};

function getLeadUtm(lead: StrategicLead, utmKey: string): string | null {
  // First check top-level field
  const topLevel = (lead as any)[utmKey];
  if (topLevel && String(topLevel).trim()) return String(topLevel).trim();
  // Then check extra_data with multiple possible column names
  const extra = lead.extra_data as Record<string, string> | null;
  if (!extra) return null;
  const candidates = UTM_FIELD_NAMES[utmKey] || [utmKey];
  for (const key of candidates) {
    // Try exact and case-insensitive match
    for (const [k, v] of Object.entries(extra)) {
      if (k.toLowerCase() === key.toLowerCase() && v && String(v).trim()) return String(v).trim();
    }
  }
  return null;
}

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

function DraggableLeadCard({ lead, onClick, studentInfo }: { lead: StrategicLead; onClick: () => void; studentInfo?: StudentInfo }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id, data: { lead } });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 } : undefined;

  const entryDate = getLeadEntryDate(lead);
  const scoring = computeLeadScore(lead);

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card className="cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow" onClick={e => { e.stopPropagation(); onClick(); }}>
        <CardContent className="p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium truncate">{lead.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              {studentInfo?.isStudent && (
                <Badge className="text-[10px] h-5 bg-cyan-500 hover:bg-cyan-600 text-white gap-0.5">
                  <GraduationCap className="h-3 w-3" />Aluno
                </Badge>
              )}
              <Badge className={`text-[10px] h-5 ${scoring.isQualified ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}>
                {scoring.score}pts
              </Badge>
            </div>
          </div>
          {studentInfo?.isStudent && studentInfo.products.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {studentInfo.products.map((p, i) => (
                <Badge key={i} variant="outline" className="text-[10px] h-5 border-cyan-300 text-cyan-700 dark:text-cyan-300">
                  {p.name}
                </Badge>
              ))}
            </div>
          )}
          {lead.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</p>}
          <div className="flex flex-wrap gap-1">
            {entryDate && <Badge variant="secondary" className="text-[10px] h-5"><Clock className="h-2.5 w-2.5 mr-0.5" />{entryDate.date}{entryDate.time ? ` ${entryDate.time}` : ''}</Badge>}
            {(() => { const v = getLeadUtm(lead, 'utm_source'); return v ? <Badge variant="outline" className="text-[10px] h-5">{v}</Badge> : null; })()}
            {(() => { const v = getLeadUtm(lead, 'utm_medium'); return v ? <Badge variant="outline" className="text-[10px] h-5">{v}</Badge> : null; })()}
            {(() => { const v = getLeadUtm(lead, 'utm_campaign'); return v ? <Badge variant="outline" className="text-[10px] h-5">{v}</Badge> : null; })()}
            {(() => { const v = getLeadUtm(lead, 'utm_content'); return v ? <Badge variant="outline" className="text-[10px] h-5">{v}</Badge> : null; })()}
            {(() => { const v = getLeadUtm(lead, 'utm_term'); return v ? <Badge variant="outline" className="text-[10px] h-5">{v}</Badge> : null; })()}
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
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [observation, setObservation] = useState("");
  const { data: salesData } = useSalesLookup();
  const updateStage = useUpdateLeadStage();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const { data: history = [] } = useLeadHistory(selectedLead?.id);

  const studentInfoMap = useMemo(() => {
    if (!salesData) return new Map<string, StudentInfo>();
    const map = new Map<string, StudentInfo>();
    leads.forEach(l => {
      const info = getStudentInfo(l, salesData);
      if (info.isStudent) map.set(l.id, info);
    });
    return map;
  }, [leads, salesData]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Extract all unique field names and their unique values from extra_data
  const fieldOptions = useMemo(() => {
    const fieldsMap: Record<string, Set<string>> = {};
    // Add built-in fields
    const builtIn: Record<string, (l: StrategicLead) => string | null | undefined> = {
      "Qualificado": l => l.is_qualified ? "Sim" : "Não",
      "Aluno": l => studentInfoMap.has(l.id) ? "Sim" : "Não",
      [UTM_LABELS.utm_source]: l => getLeadUtm(l, 'utm_source'),
      [UTM_LABELS.utm_medium]: l => getLeadUtm(l, 'utm_medium'),
      [UTM_LABELS.utm_campaign]: l => getLeadUtm(l, 'utm_campaign'),
      [UTM_LABELS.utm_content]: l => getLeadUtm(l, 'utm_content'),
      [UTM_LABELS.utm_term]: l => getLeadUtm(l, 'utm_term'),
    };
    for (const [label, getter] of Object.entries(builtIn)) {
      fieldsMap[label] = new Set();
      leads.forEach(l => {
        const v = getter(l);
        if (v && v.trim()) fieldsMap[label].add(v.trim());
      });
    }
    // Add extra_data fields
    leads.forEach(l => {
      const extra = l.extra_data as Record<string, string> | null;
      if (!extra) return;
      Object.entries(extra).forEach(([key, val]) => {
        if (!key.trim()) return;
        if (!fieldsMap[key]) fieldsMap[key] = new Set();
        if (val && String(val).trim()) fieldsMap[key].add(String(val).trim());
      });
    });
    // Only keep fields with 2+ distinct values (useful for filtering) and <= 200 values
    const result: { field: string; values: string[] }[] = [];
    Object.entries(fieldsMap).forEach(([field, vals]) => {
      if (vals.size >= 2 && vals.size <= 200) {
        result.push({ field, values: Array.from(vals).sort() });
      }
    });
    return result;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    let filtered = leads;

    // Apply text search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(l => {
        const extra = l.extra_data as Record<string, string> | null;
        const extraMatch = extra ? Object.values(extra).some(v => v && String(v).toLowerCase().includes(q)) : false;
        return l.name?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.utm_source?.toLowerCase().includes(q) ||
          l.utm_campaign?.toLowerCase().includes(q) ||
          extraMatch;
      });
    }

    // Apply field filters
    const activeEntries = Object.entries(activeFilters).filter(([, v]) => v);
    if (activeEntries.length > 0) {
      filtered = filtered.filter(l => {
        const extra = l.extra_data as Record<string, string> | null;
        return activeEntries.every(([field, filterVal]) => {
          // Check built-in fields
          if (field === "Qualificado") return (l.is_qualified ? "Sim" : "Não") === filterVal;
          if (field === "Aluno") return (studentInfoMap.has(l.id) ? "Sim" : "Não") === filterVal;
          if (field === UTM_LABELS.utm_source) return getLeadUtm(l, 'utm_source') === filterVal;
          if (field === UTM_LABELS.utm_medium) return getLeadUtm(l, 'utm_medium') === filterVal;
          if (field === UTM_LABELS.utm_campaign) return getLeadUtm(l, 'utm_campaign') === filterVal;
          if (field === UTM_LABELS.utm_content) return getLeadUtm(l, 'utm_content') === filterVal;
          if (field === UTM_LABELS.utm_term) return getLeadUtm(l, 'utm_term') === filterVal;
          // Check extra_data
          if (!extra) return false;
          return String(extra[field] || '').trim() === filterVal;
        });
      });
    }

    // Apply date filter
    if (dateFrom || dateTo) {
      filtered = filtered.filter(l => {
        const entry = getLeadEntryDate(l);
        if (!entry) return false;
        // Parse dd/mm/yyyy to comparable format
        const parts = entry.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (!parts) return false;
        const isoDate = `${parts[3]}-${parts[2]}-${parts[1]}`;
        if (dateFrom && isoDate < dateFrom) return false;
        if (dateTo && isoDate > dateTo) return false;
        return true;
      });
    }

    return filtered;
  }, [leads, search, activeFilters, dateFrom, dateTo]);

  const leadsByStage = useMemo(() => {
    const map: Record<string, StrategicLead[]> = {};
    STAGES.forEach(s => { map[s] = []; });
    filteredLeads.forEach(l => { if (map[l.stage]) map[l.stage].push(l); });
    Object.values(map).forEach(arr => arr.sort((a, b) => getLeadEntryTimestamp(b) - getLeadEntryTimestamp(a)));
    return map;
  }, [filteredLeads]);

  const getPage = (stage: string) => stagePages[stage] || 0;
  const setPage = (stage: string, page: number) => setStagePages(prev => ({ ...prev, [stage]: page }));

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

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
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
            value={search}
            onChange={e => { setSearch(e.target.value); setStagePages({}); }}
            className="pl-9 h-9"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="h-9 gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">{activeFilterCount}</Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setActiveFilters({}); setDateFrom(""); setDateTo(""); setStagePages({}); }} className="h-9 text-xs gap-1">
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/20">
          <div className="flex items-center gap-1.5 min-w-[300px]">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Data:</label>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setStagePages({}); }} className="h-8 text-xs" />
            <span className="text-xs text-muted-foreground">até</span>
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setStagePages({}); }} className="h-8 text-xs" />
          </div>
          {fieldOptions.map(({ field, values }) => (
            <div key={field} className="min-w-[160px]">
              <Select
                value={activeFilters[field] || ""}
                onValueChange={val => {
                  setActiveFilters(prev => {
                    const next = { ...prev };
                    if (val === "__clear__") { delete next[field]; } else { next[field] = val; }
                    return next;
                  });
                  setStagePages({});
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={field} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__clear__">
                    <span className="text-muted-foreground">Todos — {field}</span>
                  </SelectItem>
                  {values.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
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
                  <DraggableLeadCard key={lead.id} lead={lead} studentInfo={studentInfoMap.get(lead.id)} onClick={() => { setSelectedLead(lead); setObservation(lead.observation || ""); }} />
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

      <Sheet open={!!selectedLead} onOpenChange={open => { if (!open) setSelectedLead(null); else if (selectedLead) setObservation(selectedLead.observation || ""); }}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedLead && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>{selectedLead.name}</SheetTitle>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Essa ação não pode ser desfeita. O lead "{selectedLead.name}" será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { deleteLead.mutate(selectedLead.id); setSelectedLead(null); }}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
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
                  {(() => {
                    const src = getLeadUtm(selectedLead, 'utm_source');
                    const med = getLeadUtm(selectedLead, 'utm_medium');
                    const camp = getLeadUtm(selectedLead, 'utm_campaign');
                    const cont = getLeadUtm(selectedLead, 'utm_content');
                    const term = getLeadUtm(selectedLead, 'utm_term');
                    if (!src && !med && !camp && !cont && !term) return null;
                    return (
                      <div>
                        <p className="text-sm font-medium mb-1.5">UTMs</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {src && <div><span className="text-muted-foreground">Origem:</span> <span className="ml-1">{src}</span></div>}
                          {med && <div><span className="text-muted-foreground">Público:</span> <span className="ml-1">{med}</span></div>}
                          {camp && <div><span className="text-muted-foreground">Campanha:</span> <span className="ml-1">{camp}</span></div>}
                          {cont && <div><span className="text-muted-foreground">Criativo:</span> <span className="ml-1">{cont}</span></div>}
                          {term && <div><span className="text-muted-foreground">Tráfego:</span> <span className="ml-1">{term}</span></div>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Lead Scoring */}
                  {(() => {
                    const scoring = computeLeadScore(selectedLead);
                    return (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><TrendingUp className="h-4 w-4" />Lead Scoring</p>
                        <div className="rounded-md border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Status</span>
                            <Badge className={`${scoring.isQualified ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}>
                              {scoring.isQualified ? "Qualificado" : "Desqualificado"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between border rounded p-1.5">
                              <span className="text-muted-foreground">Faturamento</span>
                              <span className={`font-mono font-medium ${scoring.faturamentoQualifies ? "text-green-600" : "text-red-500"}`}>{scoring.breakdown.faturamento} pts</span>
                            </div>
                            <div className="flex justify-between border rounded p-1.5">
                              <span className="text-muted-foreground">Lucro</span>
                              <span className={`font-mono font-medium ${scoring.lucroQualifies ? "text-green-600" : "text-red-500"}`}>{scoring.breakdown.lucro} pts</span>
                            </div>
                            <div className="flex justify-between border rounded p-1.5">
                              <span className="text-muted-foreground">Empreita</span>
                              <span className="font-mono font-medium">{scoring.breakdown.empreita} pts</span>
                            </div>
                            <div className="flex justify-between border rounded p-1.5 bg-muted/30">
                              <span className="font-medium">Total</span>
                              <span className="font-mono font-bold">{scoring.score} pts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Aluno */}
                  {(() => {
                    const info = studentInfoMap.get(selectedLead.id);
                    if (!info?.isStudent) return null;
                    return (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4" />Aluno
                          <Badge className="text-[10px] h-5 bg-cyan-500 hover:bg-cyan-600 text-white">Identificado</Badge>
                        </p>
                        <div className="rounded-md border p-3 space-y-1.5">
                          {info.products.map((p, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="font-medium">{p.name}</span>
                              <Badge variant="outline" className="text-[10px] h-4 capitalize">{p.platform}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
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
                    <p className="text-sm font-medium mb-1.5">Observação</p>
                    <Textarea
                      value={observation}
                      onChange={e => setObservation(e.target.value)}
                      placeholder="Adicione uma observação sobre este lead..."
                      className="min-h-[80px] text-sm"
                    />
                    {observation !== (selectedLead.observation || "") && (
                      <Button
                        size="sm"
                        className="mt-2 gap-1"
                        onClick={() => {
                          updateLead.mutate({ id: selectedLead.id, observation: observation || null } as any);
                          setSelectedLead({ ...selectedLead, observation });
                        }}
                        disabled={updateLead.isPending}
                      >
                        <Save className="h-3.5 w-3.5" /> Salvar
                      </Button>
                    )}
                  </div>

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
