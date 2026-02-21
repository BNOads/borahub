import { useTicketLogs, type TicketLog } from "@/hooks/useTickets";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, ArrowRightLeft, CheckCircle2, Plus, Paperclip, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ReactNode> = {
  criado: <Plus className="h-4 w-4" />,
  status_alterado: <AlertCircle className="h-4 w-4" />,
  responsavel_transferido: <ArrowRightLeft className="h-4 w-4" />,
  comentario: <MessageSquare className="h-4 w-4" />,
  anexo_adicionado: <Paperclip className="h-4 w-4" />,
  encerrado: <CheckCircle2 className="h-4 w-4" />,
};

const COLOR_MAP: Record<string, string> = {
  criado: "bg-primary/10 text-primary",
  status_alterado: "bg-accent/20 text-accent-foreground",
  responsavel_transferido: "bg-warning/20 text-warning",
  comentario: "bg-muted text-muted-foreground",
  anexo_adicionado: "bg-muted text-muted-foreground",
  encerrado: "bg-success/20 text-success",
};

export function TicketLogTimeline({ ticketId }: { ticketId: string }) {
  const { data: logs, isLoading } = useTicketLogs(ticketId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  if (!logs?.length) return <p className="text-sm text-muted-foreground">Nenhum registro.</p>;

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-3">
          <div className={cn("flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center", COLOR_MAP[log.acao] || "bg-muted text-muted-foreground")}>
            {ICON_MAP[log.acao] || <AlertCircle className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{log.usuario_nome || "Sistema"}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
              </span>
            </div>
            {log.descricao && <p className="text-sm text-muted-foreground mt-0.5">{log.descricao}</p>}
            {log.campo_alterado && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {log.valor_anterior} → {log.valor_novo}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
