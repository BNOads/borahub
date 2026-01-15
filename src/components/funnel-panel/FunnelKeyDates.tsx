import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Check, Clock, Circle } from "lucide-react";
import { FunnelData, getDateStatus, DateStatus } from "./types";
import { cn } from "@/lib/utils";

interface FunnelKeyDatesProps {
  funnel: FunnelData;
}

interface DateItem {
  name: string;
  date: string | null;
  status: DateStatus;
}

const statusIcons: Record<DateStatus, React.ReactNode> = {
  future: <Circle className="h-3 w-3" />,
  in_progress: <Clock className="h-3 w-3 animate-pulse" />,
  completed: <Check className="h-3 w-3" />,
};

const statusColors: Record<DateStatus, string> = {
  future: "text-muted-foreground bg-muted",
  in_progress: "text-accent bg-accent/10",
  completed: "text-green-500 bg-green-500/10",
};

export function FunnelKeyDates({ funnel }: FunnelKeyDatesProps) {
  const dates: DateItem[] = [
    { name: "Início da Captação", date: funnel.captacao_start || null, status: getDateStatus(funnel.captacao_start || null) },
    { name: "Fim da Captação", date: funnel.captacao_end || null, status: getDateStatus(funnel.captacao_end || null) },
    { name: "Início do Aquecimento", date: funnel.aquecimento_start || null, status: getDateStatus(funnel.aquecimento_start || null) },
    { name: "Início do CPL", date: funnel.cpl_start || null, status: getDateStatus(funnel.cpl_start || null) },
    { name: "Início do Carrinho", date: funnel.carrinho_start || null, status: getDateStatus(funnel.carrinho_start || null) },
    { name: "Fechamento", date: funnel.fechamento_date || null, status: getDateStatus(funnel.fechamento_date || null) },
  ];

  const formatDate = (date: string | null) => {
    if (!date) return "Não definido";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent" />
          Datas-Chave
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {dates.map((item, index) => (
            <div
              key={item.name}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg transition-colors",
                item.status === "in_progress" && "bg-accent/5"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-1 rounded-full", statusColors[item.status])}>
                  {statusIcons[item.status]}
                </div>
                <span className={cn(
                  "text-sm",
                  item.status === "completed" && "line-through text-muted-foreground"
                )}>
                  {item.name}
                </span>
              </div>
              <span className={cn(
                "text-sm font-medium",
                !item.date && "text-muted-foreground"
              )}>
                {formatDate(item.date)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
