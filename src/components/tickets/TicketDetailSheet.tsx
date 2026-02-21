import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTicket, useTicketAnexos, useUpdateTicketStatus, type Ticket } from "@/hooks/useTickets";
import { TicketLogTimeline } from "./TicketLogTimeline";
import { TicketCommentForm } from "./TicketCommentForm";
import { TicketTransferModal } from "./TicketTransferModal";
import { TicketCloseModal } from "./TicketCloseModal";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRightLeft, CheckCircle2, Clock, ExternalLink, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando cliente",
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

interface Props {
  ticketId: string | null;
  onClose: () => void;
}

export function TicketDetailSheet({ ticketId, onClose }: Props) {
  const { data: ticket } = useTicket(ticketId);
  const { data: anexos } = useTicketAnexos(ticketId);
  const updateStatus = useUpdateTicketStatus();
  const [transferOpen, setTransferOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  if (!ticket) return null;

  const isClosed = ticket.status === "encerrado" || ticket.status === "resolvido";
  const slaExpired = ticket.sla_limite && new Date(ticket.sla_limite) < new Date() && !isClosed;

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus.mutateAsync({ ticketId: ticket.id, status: newStatus, previousStatus: ticket.status });
  };

  const slaText = ticket.sla_limite
    ? (slaExpired
        ? `Atrasado (${formatDistanceToNow(new Date(ticket.sla_limite), { locale: ptBR })})`
        : `${formatDistanceToNow(new Date(ticket.sla_limite), { locale: ptBR, addSuffix: false })} restantes`)
    : "Sem SLA";

  return (
    <Sheet open={!!ticketId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>Ticket #{ticket.numero}</span>
            <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[ticket.status])}>
              {STATUS_LABELS[ticket.status]}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Info do cliente */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{ticket.cliente_nome}</span></div>
            <div><span className="text-muted-foreground">Email:</span> <span>{ticket.cliente_email}</span></div>
            <div><span className="text-muted-foreground">WhatsApp:</span> <span>{ticket.cliente_whatsapp}</span></div>
            <div><span className="text-muted-foreground">Origem:</span> <span>{ticket.origem}</span></div>
            <div><span className="text-muted-foreground">Categoria:</span> <span>{ticket.categoria}</span></div>
            <div>
              <span className="text-muted-foreground">Prioridade:</span>{" "}
              <Badge variant="outline" className={cn("text-xs", PRIORIDADE_COLORS[ticket.prioridade])}>{ticket.prioridade}</Badge>
            </div>
            <div><span className="text-muted-foreground">Responsável:</span> <span className="font-medium">{ticket.responsavel?.display_name || ticket.responsavel?.full_name}</span></div>
            <div className="flex items-center gap-1">
              <Clock className={cn("h-3.5 w-3.5", slaExpired ? "text-destructive" : "text-muted-foreground")} />
              <span className={cn("text-sm", slaExpired && "text-destructive font-medium")}>{slaText}</span>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <h4 className="text-sm font-medium mb-1">Descrição</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.descricao}</p>
          </div>

          {/* Ações */}
          {!isClosed && (
            <div className="flex flex-wrap gap-2">
              <Select value={ticket.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).filter(([k]) => k !== "encerrado").map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft className="h-4 w-4 mr-1" /> Transferir
              </Button>
              <Button size="sm" variant="default" onClick={() => setCloseOpen(true)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Encerrar
              </Button>
            </div>
          )}

          {/* Solução (se encerrado) */}
          {ticket.solucao_descricao && (
            <div className="bg-success/5 border border-success/20 rounded-lg p-3">
              <h4 className="text-sm font-medium text-success mb-1">Solução</h4>
              <p className="text-sm whitespace-pre-wrap">{ticket.solucao_descricao}</p>
              {ticket.tempo_resolucao && (
                <p className="text-xs text-muted-foreground mt-2">
                  Resolvido em {Math.floor(ticket.tempo_resolucao / 60)}h {ticket.tempo_resolucao % 60}m
                </p>
              )}
            </div>
          )}

          {/* Anexos */}
          {anexos && anexos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Anexos ({anexos.length})</h4>
              <div className="space-y-1">
                {anexos.map((a) => (
                  <a key={a.id} href={a.arquivo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Paperclip className="h-3.5 w-3.5" /> {a.arquivo_nome}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Tabs: Comentários / Histórico */}
          <Tabs defaultValue="historico">
            <TabsList className="w-full">
              <TabsTrigger value="historico" className="flex-1">Histórico</TabsTrigger>
              <TabsTrigger value="comentar" className="flex-1">Comentar</TabsTrigger>
            </TabsList>
            <TabsContent value="historico" className="mt-3">
              <TicketLogTimeline ticketId={ticket.id} />
            </TabsContent>
            <TabsContent value="comentar" className="mt-3">
              <TicketCommentForm ticketId={ticket.id} />
            </TabsContent>
          </Tabs>
        </div>

        <TicketTransferModal
          open={transferOpen}
          onOpenChange={setTransferOpen}
          ticketId={ticket.id}
          currentResponsavelId={ticket.responsavel_id}
          linkedTaskId={ticket.linked_task_id}
        />
        <TicketCloseModal
          open={closeOpen}
          onOpenChange={setCloseOpen}
          ticketId={ticket.id}
          linkedTaskId={ticket.linked_task_id}
          createdAt={ticket.created_at}
        />
      </SheetContent>
    </Sheet>
  );
}
