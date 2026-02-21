import { useHomeTickets } from "@/hooks/useTickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Headphones, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function TicketSupportCard() {
  const { data: tickets, isLoading } = useHomeTickets();
  const navigate = useNavigate();

  const total = tickets?.length ?? 0;
  const atrasados = tickets?.filter((t) => t.sla_limite && new Date(t.sla_limite) < new Date()).length ?? 0;
  const criticos = tickets?.filter((t) => t.prioridade === "critica").length ?? 0;

  const nextSla = tickets
    ?.filter((t) => t.sla_limite && new Date(t.sla_limite) > new Date())
    .sort((a, b) => new Date(a.sla_limite!).getTime() - new Date(b.sla_limite!).getTime())[0];

  const hasAlert = atrasados > 0;
  const hasCritical = criticos > 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        hasAlert && "border-destructive/50",
        hasCritical && "animate-pulse border-destructive"
      )}
      onClick={() => navigate("/suporte")}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Headphones className="h-5 w-5" />
          Central de Suporte
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum ticket aberto 🎉</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Abertos</span>
              <span className="font-bold">{total}</span>
            </div>
            {atrasados > 0 && (
              <div className="flex items-center justify-between text-sm text-destructive">
                <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Atrasados</span>
                <span className="font-bold">{atrasados}</span>
              </div>
            )}
            {criticos > 0 && (
              <div className="flex items-center justify-between text-sm text-destructive">
                <span>Críticos</span>
                <span className="font-bold">{criticos}</span>
              </div>
            )}
            {nextSla && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                Próximo SLA: {formatDistanceToNow(new Date(nextSla.sla_limite!), { locale: ptBR, addSuffix: true })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
