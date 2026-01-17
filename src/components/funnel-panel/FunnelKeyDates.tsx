import { Calendar } from "lucide-react";
import { FunnelData, getDateStatus, DateStatus } from "./types";
import { cn } from "@/lib/utils";

interface FunnelKeyDatesProps {
  funnel: FunnelData;
}

interface DateItem {
  name: string;
  date: string | null;
  status: DateStatus;
  color: string;
  bgColor: string;
}

export function FunnelKeyDates({ funnel }: FunnelKeyDatesProps) {
  const dates: DateItem[] = [
    { 
      name: "Início Captação", 
      date: funnel.captacao_start || null, 
      status: getDateStatus(funnel.captacao_start || null),
      color: "border-cyan-400 text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20"
    },
    { 
      name: "Fim Captação", 
      date: funnel.captacao_end || null, 
      status: getDateStatus(funnel.captacao_end || null),
      color: "border-emerald-400 text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20"
    },
    { 
      name: "Início Aquecimento", 
      date: funnel.aquecimento_start || null, 
      status: getDateStatus(funnel.aquecimento_start || null),
      color: "border-sky-400 text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-50 dark:bg-sky-900/20"
    },
    { 
      name: "Início CPL", 
      date: funnel.cpl_start || null, 
      status: getDateStatus(funnel.cpl_start || null),
      color: "border-orange-400 text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20"
    },
    { 
      name: "Início Carrinho", 
      date: funnel.carrinho_start || null, 
      status: getDateStatus(funnel.carrinho_start || null),
      color: "border-amber-400 text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20"
    },
    { 
      name: "Fechamento", 
      date: funnel.fechamento_date || null, 
      status: getDateStatus(funnel.fechamento_date || null),
      color: "border-rose-400 text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-900/20"
    },
  ];

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const validDates = dates.filter(d => d.date);

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">Datas-Chave</span>
      </div>

      {validDates.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {dates.map((item) => item.date && (
            <div
              key={item.name}
              className={cn(
                "px-3 py-2 rounded-xl border-2 text-center",
                item.color,
                item.bgColor,
                item.status === "completed" && "opacity-60"
              )}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                {item.status === "in_progress" && (
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                )}
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  {item.name}
                </span>
              </div>
              <span className="text-sm font-bold">
                {formatDate(item.date)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma data definida</p>
        </div>
      )}
    </div>
  );
}
