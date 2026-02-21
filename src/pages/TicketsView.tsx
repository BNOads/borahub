import { useState, useMemo } from "react";
import { useTickets, type Ticket } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateTicketModal } from "@/components/tickets/CreateTicketModal";
import { TicketDetailSheet } from "@/components/tickets/TicketDetailSheet";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { TicketDashboard } from "@/components/tickets/TicketDashboard";
import { Plus, Headphones } from "lucide-react";
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
  aberto: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  em_atendimento: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  aguardando_cliente: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  escalado: "bg-destructive/10 text-destructive",
  resolvido: "bg-success/10 text-success",
  encerrado: "bg-muted text-muted-foreground",
};

const PRIORIDADE_COLORS: Record<string, string> = {
  critica: "bg-destructive/10 text-destructive",
  alta: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  media: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  baixa: "bg-muted text-muted-foreground",
};

export default function TicketsView() {
  const { data: tickets, isLoading } = useTickets();
  const { user, isAdmin } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("meus");
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

    if (tab === "meus") {
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
  }, [tickets, tab, search, statusFilter, prioridadeFilter, categoriaFilter, user?.id]);

  const getSlaText = (t: Ticket) => {
    if (!t.sla_limite) return "-";
    const slaDate = new Date(t.sla_limite);
    const isClosed = t.status === "encerrado" || t.status === "resolvido";
    if (isClosed) return "Encerrado";
    if (slaDate < new Date()) return "Atrasado";
    return formatDistanceToNow(slaDate, { locale: ptBR, addSuffix: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Central de Tickets</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Ticket
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="meus">Meus Tickets</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          {isAdmin && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
        </TabsList>

        <TabsContent value="meus" className="space-y-4 mt-4">
          <TicketFilters search={search} onSearchChange={setSearch} status={statusFilter} onStatusChange={setStatusFilter} prioridade={prioridadeFilter} onPrioridadeChange={setPrioridadeFilter} categoria={categoriaFilter} onCategoriaChange={setCategoriaFilter} categorias={categorias} />
          <TicketTable tickets={filtered} isLoading={isLoading} getSlaText={getSlaText} onSelect={setSelectedId} />
        </TabsContent>
        <TabsContent value="todos" className="space-y-4 mt-4">
          <TicketFilters search={search} onSearchChange={setSearch} status={statusFilter} onStatusChange={setStatusFilter} prioridade={prioridadeFilter} onPrioridadeChange={setPrioridadeFilter} categoria={categoriaFilter} onCategoriaChange={setCategoriaFilter} categorias={categorias} />
          <TicketTable tickets={filtered} isLoading={isLoading} getSlaText={getSlaText} onSelect={setSelectedId} />
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

function TicketTable({ tickets, isLoading, getSlaText, onSelect }: {
  tickets: Ticket[];
  isLoading: boolean;
  getSlaText: (t: Ticket) => string;
  onSelect: (id: string) => void;
}) {
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (tickets.length === 0) return <p className="text-sm text-muted-foreground">Nenhum ticket encontrado.</p>;

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
            return (
              <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(t.id)}>
                <TableCell className="font-mono text-sm">{t.numero}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{t.cliente_nome}</p>
                    <p className="text-xs text-muted-foreground">{t.cliente_email}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">{t.categoria}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", PRIORIDADE_COLORS[t.prioridade])}>{t.prioridade}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{t.responsavel?.display_name || t.responsavel?.full_name || "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[t.status])}>{STATUS_LABELS[t.status]}</Badge>
                </TableCell>
                <TableCell className={cn("hidden md:table-cell text-sm", slaExpired && "text-destructive font-medium")}>{slaText}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
