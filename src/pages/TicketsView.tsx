import { useState, useMemo } from "react";
import { useTickets, type Ticket } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreateTicketModal } from "@/components/tickets/CreateTicketModal";
import { TicketDetailSheet } from "@/components/tickets/TicketDetailSheet";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { TicketDashboard } from "@/components/tickets/TicketDashboard";
import { Plus, Headphones, Ticket as TicketIcon, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

  // Summary stats
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

          {/* Filter row with "only mine" toggle */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="only-mine" checked={onlyMine} onCheckedChange={setOnlyMine} />
                <Label htmlFor="only-mine" className="text-sm cursor-pointer">
                  Somente meus tickets
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
              </p>
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
          <TicketTable tickets={filtered} isLoading={isLoading} getSlaText={getSlaText} onSelect={setSelectedId} currentUserId={user?.id} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="dashboard" className="mt-4">
            <TicketDashboard />
          </TabsContent>
        )}
      </Tabs>

      <CreateTicketModal open={createOpen} onOpenChange={setCreateOpen} />
      <TicketDetailSheet ticketId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function TicketTable({ tickets, isLoading, getSlaText, onSelect, currentUserId }: {
  tickets: Ticket[];
  isLoading: boolean;
  getSlaText: (t: Ticket) => string;
  onSelect: (id: string) => void;
  currentUserId?: string;
}) {
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

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[70px]">#</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden md:table-cell">Categoria</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead className="hidden lg:table-cell">Responsável</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">SLA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => {
            const slaText = getSlaText(t);
            const slaExpired = slaText === "Atrasado";
            const isMine = t.responsavel_id === currentUserId;
            return (
              <TableRow
                key={t.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  isMine && "bg-primary/[0.03]",
                  slaExpired && "bg-destructive/[0.03]"
                )}
                onClick={() => onSelect(t.id)}
              >
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
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{t.responsavel?.display_name || t.responsavel?.full_name || "-"}</span>
                    {isMine && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Eu</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[t.status])}>{STATUS_LABELS[t.status]}</Badge>
                </TableCell>
                <TableCell className={cn("hidden md:table-cell text-sm", slaExpired && "text-destructive font-semibold")}>{slaText}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
