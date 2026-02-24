import { useState, useMemo, useCallback } from "react";
import { useTickets, useQuickTransferTicket, useBulkUpdateTickets, useDeleteTicket, useUpdateTicketStatus, type Ticket } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateTicketModal } from "@/components/tickets/CreateTicketModal";
import { TicketDetailSheet } from "@/components/tickets/TicketDetailSheet";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { TicketDashboard } from "@/components/tickets/TicketDashboard";
import {
  Plus, Headphones, Ticket as TicketIcon, AlertTriangle, Clock, CheckCircle2,
  Edit3, Trash2, Loader2, X, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando",
  escalado: "Escalado",
  resolvido: "Resolvido",
  encerrado: "Encerrado",
};

const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  em_atendimento: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  aguardando_cliente: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  escalado: "bg-destructive/10 text-destructive border-destructive/20",
  resolvido: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  encerrado: "bg-muted text-muted-foreground border-muted",
};

const PRIORIDADE_COLORS: Record<string, string> = {
  critica: "bg-destructive/10 text-destructive border-destructive/20",
  alta: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  media: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  baixa: "bg-muted text-muted-foreground border-muted",
};

export default function TicketsView() {
  const { data: tickets, isLoading } = useTickets();
  const { user, isAdmin } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("tickets");
  const [onlyMine, setOnlyMine] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [prioridadeFilter, setPrioridadeFilter] = useState("all");
  const [categoriaFilter, setCategoriaFilter] = useState("all");

  // Selection state for bulk ops
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Users for reassignment
  const { data: users = [] } = useQuery({
    queryKey: ["profiles-for-ticket-reassign"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, avatar_url")
        .eq("is_active", true)
        .order("full_name");
      return data || [];
    },
  });

  const categorias = useMemo(() => {
    if (!tickets) return [];
    return [...new Set(tickets.map((t) => t.categoria))].sort();
  }, [tickets]);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    let result = [...tickets];

    if (onlyMine) {
      result = result.filter((t) => t.responsavel_id === user?.id);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((t) =>
        t.cliente_nome.toLowerCase().includes(s) ||
        t.cliente_email.toLowerCase().includes(s) ||
        t.cliente_whatsapp.includes(s) ||
        String(t.numero).includes(s)
      );
    }
    if (statusFilter !== "all") result = result.filter((t) => t.status === statusFilter);
    if (prioridadeFilter !== "all") result = result.filter((t) => t.prioridade === prioridadeFilter);
    if (categoriaFilter !== "all") result = result.filter((t) => t.categoria === categoriaFilter);

    return result;
  }, [tickets, onlyMine, search, statusFilter, prioridadeFilter, categoriaFilter, user?.id]);

  const stats = useMemo(() => {
    if (!tickets) return { total: 0, abertos: 0, atrasados: 0, resolvidos: 0 };
    const now = new Date();
    const myTickets = onlyMine ? tickets.filter((t) => t.responsavel_id === user?.id) : tickets;
    return {
      total: myTickets.length,
      abertos: myTickets.filter((t) => !["resolvido", "encerrado"].includes(t.status)).length,
      atrasados: myTickets.filter((t) => t.sla_limite && new Date(t.sla_limite) < now && !["resolvido", "encerrado"].includes(t.status)).length,
      resolvidos: myTickets.filter((t) => ["resolvido", "encerrado"].includes(t.status)).length,
    };
  }, [tickets, onlyMine, user?.id]);

  const getSlaText = (t: Ticket) => {
    if (!t.sla_limite) return "-";
    const slaDate = new Date(t.sla_limite);
    const isClosed = t.status === "encerrado" || t.status === "resolvido";
    if (isClosed) return "Concluído";
    if (slaDate < new Date()) return "Atrasado";
    return formatDistanceToNow(slaDate, { locale: ptBR, addSuffix: false });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectionMode = selectedIds.size > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Central de Suporte</h1>
              <p className="text-sm text-muted-foreground">BORAnaOBRA</p>
            </div>
          </div>
          <Badge variant="secondary" className="mt-2 text-xs font-normal">
            Gerencie tickets de suporte, acompanhe SLAs e resolva demandas dos clientes com agilidade
          </Badge>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="lg" className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Novo Ticket
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        {isAdmin && (
          <TabsList>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="tickets" className="space-y-4 mt-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4 flex items-center gap-3">
                <TicketIcon className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{stats.abertos}</p>
                  <p className="text-xs text-muted-foreground">Em aberto</p>
                </div>
              </CardContent>
            </Card>
            <Card className={cn("border-l-4", stats.atrasados > 0 ? "border-l-destructive" : "border-l-amber-500")}>
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className={cn("h-5 w-5 shrink-0", stats.atrasados > 0 ? "text-destructive" : "text-amber-500")} />
                <div>
                  <p className={cn("text-2xl font-bold", stats.atrasados > 0 && "text-destructive")}>{stats.atrasados}</p>
                  <p className="text-xs text-muted-foreground">Atrasados</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{stats.resolvidos}</p>
                  <p className="text-xs text-muted-foreground">Resolvidos</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Switch id="only-mine" checked={onlyMine} onCheckedChange={setOnlyMine} />
                <Label htmlFor="only-mine" className="text-sm cursor-pointer">
                  Somente meus tickets
                </Label>
              </div>

              <div className="flex items-center gap-2">
                {selectionMode && (
                  <>
                    <Badge variant="outline" className="gap-1">
                      {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => setBulkEditOpen(true)} className="gap-1">
                      <Edit3 className="h-3.5 w-3.5" /> Editar
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)} className="gap-1">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={clearSelection}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                <p className="text-sm text-muted-foreground">
                  {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <TicketFilters
              search={search} onSearchChange={setSearch}
              status={statusFilter} onStatusChange={setStatusFilter}
              prioridade={prioridadeFilter} onPrioridadeChange={setPrioridadeFilter}
              categoria={categoriaFilter} onCategoriaChange={setCategoriaFilter}
              categorias={categorias}
            />
          </div>

          {/* Table */}
          <TicketTable
            tickets={filtered}
            isLoading={isLoading}
            getSlaText={getSlaText}
            onSelect={setSelectedId}
            currentUserId={user?.id}
            users={users}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            isAdmin={isAdmin}
            onDelete={setDeleteConfirmId}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="dashboard" className="mt-4">
            <TicketDashboard />
          </TabsContent>
        )}
      </Tabs>

      <CreateTicketModal open={createOpen} onOpenChange={setCreateOpen} />
      <TicketDetailSheet ticketId={selectedId} onClose={() => setSelectedId(null)} />

      {/* Bulk Edit Modal */}
      <BulkEditTicketsModal
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedIds={selectedIds}
        tickets={tickets || []}
        users={users}
        onSuccess={clearSelection}
      />

      {/* Single Delete Confirm */}
      <DeleteTicketDialog
        ticketId={deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
      />

      {/* Bulk Delete Confirm */}
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        selectedIds={selectedIds}
        onSuccess={clearSelection}
      />
    </div>
  );
}

type SortKey = "numero" | "cliente_nome" | "categoria" | "prioridade" | "responsavel" | "status" | "sla";
type SortDir = "asc" | "desc";

const PRIORIDADE_ORDER: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
const STATUS_ORDER: Record<string, number> = { aberto: 0, em_atendimento: 1, aguardando_cliente: 2, escalado: 3, resolvido: 4, encerrado: 5 };

function SortableHead({ label, sortKey, currentKey, currentDir, onSort, className }: {
  label: string; sortKey: SortKey; currentKey: SortKey | null; currentDir: SortDir;
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <TableHead className={cn("cursor-pointer select-none hover:text-foreground transition-colors", className)} onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {label}
        {active ? (currentDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />}
      </div>
    </TableHead>
  );
}

/* ─── Ticket Table ─── */
function TicketTable({
  tickets, isLoading, getSlaText, onSelect, currentUserId, users,
  selectedIds, onToggleSelect, onToggleSelectAll, isAdmin, onDelete,
}: {
  tickets: Ticket[];
  isLoading: boolean;
  getSlaText: (t: Ticket) => string;
  onSelect: (id: string) => void;
  currentUserId?: string;
  users: { id: string; full_name: string; display_name: string | null; avatar_url: string | null }[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}) {
  const quickTransfer = useQuickTransferTicket();
  const updateStatus = useUpdateTicketStatus();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }, [sortKey]);

  const sorted = useMemo(() => {
    if (!sortKey) return tickets;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...tickets].sort((a, b) => {
      switch (sortKey) {
        case "numero": return (a.numero - b.numero) * dir;
        case "cliente_nome": return a.cliente_nome.localeCompare(b.cliente_nome) * dir;
        case "categoria": return a.categoria.localeCompare(b.categoria) * dir;
        case "prioridade": return ((PRIORIDADE_ORDER[a.prioridade] ?? 9) - (PRIORIDADE_ORDER[b.prioridade] ?? 9)) * dir;
        case "responsavel": {
          const nameA = users.find((u) => u.id === a.responsavel_id)?.full_name || "";
          const nameB = users.find((u) => u.id === b.responsavel_id)?.full_name || "";
          return nameA.localeCompare(nameB) * dir;
        }
        case "status": return ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)) * dir;
        case "sla": {
          const slaA = a.sla_limite ? new Date(a.sla_limite).getTime() : Infinity;
          const slaB = b.sla_limite ? new Date(b.sla_limite).getTime() : Infinity;
          return (slaA - slaB) * dir;
        }
        default: return 0;
      }
    });
  }, [tickets, sortKey, sortDir, users]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Headphones className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Nenhum ticket encontrado</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Ajuste os filtros ou crie um novo ticket</p>
      </div>
    );
  }

  const handleTransfer = async (e: React.MouseEvent, ticket: Ticket, newResponsavelId: string) => {
    e.stopPropagation();
    const u = users.find((u) => u.id === newResponsavelId);
    if (!u) return;
    try {
      await quickTransfer.mutateAsync({
        ticketId: ticket.id,
        novoResponsavelId: newResponsavelId,
        novoResponsavelNome: u.full_name,
        linkedTaskId: ticket.linked_task_id,
      });
      toast.success(`Ticket #${ticket.numero} transferido para ${u.display_name || u.full_name}`);
    } catch {
      toast.error("Erro ao transferir ticket");
    }
  };

  const handleQuickResolve = async (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    try {
      await updateStatus.mutateAsync({
        ticketId: ticket.id,
        status: "resolvido",
        previousStatus: ticket.status,
      });
      toast.success(`Ticket #${ticket.numero} marcado como resolvido`);
    } catch {
      toast.error("Erro ao resolver ticket");
    }
  };

  const allSelected = selectedIds.size === tickets.length && tickets.length > 0;

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label="Selecionar todos"
              />
            </TableHead>
            <SortableHead label="#" sortKey="numero" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[60px]" />
            <SortableHead label="Cliente" sortKey="cliente_nome" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHead label="Categoria" sortKey="categoria" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
            <SortableHead label="Prioridade" sortKey="prioridade" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHead label="Responsável" sortKey="responsavel" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="min-w-[160px]" />
            <SortableHead label="Status" sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHead label="SLA" sortKey="sla" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
            {isAdmin && <TableHead className="w-[40px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((t) => {
            const slaText = getSlaText(t);
            const slaExpired = slaText === "Atrasado";
            const isMine = t.responsavel_id === currentUserId;
            const isSelected = selectedIds.has(t.id);
            const canResolve = !["resolvido", "encerrado"].includes(t.status);
            return (
              <TableRow
                key={t.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  isSelected && "bg-primary/[0.06]",
                  isMine && !isSelected && "bg-primary/[0.03]",
                  slaExpired && !isSelected && "bg-destructive/[0.03]"
                )}
                onClick={() => onSelect(t.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(t.id)}
                  />
                </TableCell>
                <TableCell className="font-mono text-sm font-medium">{t.numero}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{t.cliente_nome}</p>
                    <p className="text-xs text-muted-foreground">{t.cliente_email}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">{t.categoria}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs capitalize", PRIORIDADE_COLORS[t.prioridade])}>{t.prioridade}</Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={t.responsavel_id}
                    onValueChange={(val) => handleTransfer({ stopPropagation: () => {} } as React.MouseEvent, t, val)}
                  >
                    <SelectTrigger className="h-8 text-xs border-dashed w-full">
                      <SelectValue>
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            const u = users.find((u) => u.id === t.responsavel_id);
                            return u ? (
                              <>
                                <img
                                  src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&size=20&background=random`}
                                  alt=""
                                  className="h-4 w-4 rounded-full object-cover shrink-0"
                                />
                                <span className="truncate">{u.display_name || u.full_name}</span>
                                {isMine && <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-0.5">Eu</Badge>}
                              </>
                            ) : (
                              <span>{t.responsavel?.display_name || t.responsavel?.full_name || "-"}</span>
                            );
                          })()}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center gap-2">
                            <img
                              src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&size=20&background=random`}
                              alt=""
                              className="h-5 w-5 rounded-full object-cover shrink-0"
                            />
                            {u.display_name || u.full_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={t.status}
                    onValueChange={async (val) => {
                      try {
                        await updateStatus.mutateAsync({
                          ticketId: t.id,
                          status: val,
                          previousStatus: t.status,
                        });
                        toast.success(`Status do ticket #${t.numero} alterado para ${STATUS_LABELS[val]}`);
                      } catch {
                        toast.error("Erro ao alterar status");
                      }
                    }}
                  >
                    <SelectTrigger className={cn("h-8 text-xs border-dashed w-[150px]", STATUS_COLORS[t.status])}>
                      <SelectValue>{STATUS_LABELS[t.status]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className={cn("hidden md:table-cell text-sm", slaExpired && "text-destructive font-semibold")}>{slaText}</TableCell>
                {isAdmin && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Bulk Edit Modal ─── */
function BulkEditTicketsModal({
  open, onOpenChange, selectedIds, tickets, users, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds: Set<string>;
  tickets: Ticket[];
  users: { id: string; full_name: string; display_name: string | null; avatar_url: string | null }[];
  onSuccess: () => void;
}) {
  const bulkUpdate = useBulkUpdateTickets();
  const [editField, setEditField] = useState<"responsavel" | "status" | "prioridade" | "">("");
  const [value, setValue] = useState("");

  const handleSubmit = async () => {
    if (!editField || !value) {
      toast.error("Selecione um campo e um valor");
      return;
    }

    const ids = Array.from(selectedIds);
    const updates: Record<string, unknown> = {};
    let novoResponsavelNome: string | undefined;

    if (editField === "responsavel") {
      updates.responsavel_id = value;
      novoResponsavelNome = users.find((u) => u.id === value)?.full_name;
    } else if (editField === "status") {
      updates.status = value;
    } else if (editField === "prioridade") {
      updates.prioridade = value;
    }

    try {
      await bulkUpdate.mutateAsync({ ticketIds: ids, updates, novoResponsavelNome });
      toast.success(`${ids.length} ticket${ids.length > 1 ? "s" : ""} atualizado${ids.length > 1 ? "s" : ""}`);
      onOpenChange(false);
      setEditField("");
      setValue("");
      onSuccess();
    } catch {
      toast.error("Erro ao atualizar tickets");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setEditField("");
    setValue("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Editar {selectedIds.size} ticket{selectedIds.size > 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            Selecione o campo e o novo valor para aplicar a todos os tickets selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Campo a alterar</Label>
            <Select value={editField} onValueChange={(v) => { setEditField(v as typeof editField); setValue(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o campo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="responsavel">Responsável</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="prioridade">Prioridade</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {editField === "responsavel" && (
            <div className="space-y-2">
              <Label>Novo responsável</Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-2">
                        <img
                          src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&size=20&background=random`}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover shrink-0"
                        />
                        {u.display_name || u.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {editField === "status" && (
            <div className="space-y-2">
              <Label>Novo status</Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {editField === "prioridade" && (
            <div className="space-y-2">
              <Label>Nova prioridade</Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!editField || !value || bulkUpdate.isPending}>
            {bulkUpdate.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Delete Ticket Dialog ─── */
function DeleteTicketDialog({ ticketId, onClose }: { ticketId: string | null; onClose: () => void }) {
  const deleteTicket = useDeleteTicket();

  const handleDelete = async () => {
    if (!ticketId) return;
    try {
      await deleteTicket.mutateAsync(ticketId);
      toast.success("Ticket excluído");
      onClose();
    } catch {
      toast.error("Erro ao excluir ticket");
    }
  };

  return (
    <AlertDialog open={!!ticketId} onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir ticket?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é irreversível. O ticket e todo o seu histórico serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteTicket.isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ─── Bulk Delete Dialog ─── */
function BulkDeleteDialog({
  open, onOpenChange, selectedIds, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds: Set<string>;
  onSuccess: () => void;
}) {
  const deleteTicket = useDeleteTicket();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      for (const id of selectedIds) {
        await deleteTicket.mutateAsync(id);
      }
      toast.success(`${selectedIds.size} ticket${selectedIds.size > 1 ? "s" : ""} excluído${selectedIds.size > 1 ? "s" : ""}`);
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Erro ao excluir tickets");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {selectedIds.size} ticket{selectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é irreversível. Todos os tickets selecionados e seus históricos serão removidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleting}
          >
            {deleting ? "Excluindo..." : "Excluir todos"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
