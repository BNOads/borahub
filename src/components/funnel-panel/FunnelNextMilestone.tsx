import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Target } from "lucide-react";
import { FunnelData, getNextMilestone, getFunnelProgress, formatCountdown } from "./types";
import { useEffect, useState } from "react";

interface FunnelNextMilestoneProps {
  funnel: FunnelData;
}

export function FunnelNextMilestone({ funnel }: FunnelNextMilestoneProps) {
  const [countdown, setCountdown] = useState("");
  const milestone = getNextMilestone(funnel);
  const progress = getFunnelProgress(funnel);

  useEffect(() => {
    if (!milestone) return;

    const updateCountdown = () => {
      setCountdown(formatCountdown(milestone.date));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [milestone]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          Próximo Marco
        </CardTitle>
      </CardHeader>
      <CardContent>
        {milestone ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{milestone.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(milestone.date)}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-accent">
                  <Clock className="h-4 w-4" />
                  <span className="font-bold text-lg">{countdown}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso Geral</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p>Nenhum marco futuro definido</p>
            <p className="text-xs mt-1">Configure as datas do funil</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
