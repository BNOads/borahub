import { Progress } from "@/components/ui/progress";
import { Clock, BookOpen } from "lucide-react";
import { FunnelData, getNextMilestone, getFunnelProgress, formatCountdown } from "./types";
import { useEffect, useState } from "react";

interface FunnelNextMilestoneProps {
  funnel: FunnelData;
}

export function FunnelNextMilestone({ funnel }: FunnelNextMilestoneProps) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  const milestone = getNextMilestone(funnel);
  const progress = getFunnelProgress(funnel);

  useEffect(() => {
    if (!milestone) return;

    const updateCountdown = () => {
      const now = new Date();
      const target = new Date(milestone.date);
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setCountdown({ days, hours, minutes });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [milestone]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
    });
  };

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Próximo Evento</span>
        </div>
        
        {milestone ? (
          <>
            <p className="text-xs text-muted-foreground mb-4">{milestone.name}</p>
            
            {/* Countdown grande */}
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-bold text-foreground">{countdown.days}</span>
              <span className="text-muted-foreground text-sm mr-2">dias</span>
              <span className="text-2xl font-bold text-muted-foreground">:</span>
              <span className="text-5xl font-bold text-foreground">{countdown.hours}</span>
              <span className="text-muted-foreground text-sm mr-2">horas</span>
              <span className="text-2xl font-bold text-muted-foreground">:</span>
              <span className="text-5xl font-bold text-foreground">{String(countdown.minutes).padStart(2, '0')}</span>
              <span className="text-muted-foreground text-sm">min</span>
            </div>

            {/* Próxima aula */}
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                {milestone.name}
              </span>
            </div>
            
            {/* Data e progresso */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl font-bold text-amber-500">{countdown.days}d</span>
              <span className="text-sm text-muted-foreground">{formatDate(milestone.date)}</span>
            </div>
            
            <Progress value={progress} className="h-2 bg-emerald-100 dark:bg-emerald-900/30" />
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum marco futuro definido</p>
            <p className="text-xs mt-1">Configure as datas do funil</p>
          </div>
        )}
      </div>
    </div>
  );
}
