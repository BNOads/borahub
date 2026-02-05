import { useFunnelDailyReports } from "@/hooks/useFunnelDailyReports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Phone, Calendar, Video, DollarSign } from "lucide-react";
import { useMemo } from "react";

interface FunnelStagesCardProps {
  funnelId: string;
}

interface StageData {
  name: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export function FunnelStagesCard({ funnelId }: FunnelStagesCardProps) {
  const { data: reports } = useFunnelDailyReports(funnelId);

  const totals = useMemo(() => {
    if (!reports || reports.length === 0) {
      return {
        contacts: 0,
        followups: 0,
        meetings_scheduled: 0,
        meetings_held: 0,
        sales: 0,
      };
    }

    return reports.reduce(
      (acc, report) => ({
        contacts: acc.contacts + report.contacts,
        followups: acc.followups + report.followups,
        meetings_scheduled: acc.meetings_scheduled + report.meetings_scheduled,
        meetings_held: acc.meetings_held + report.meetings_held,
        sales: acc.sales + report.sales,
      }),
      { contacts: 0, followups: 0, meetings_scheduled: 0, meetings_held: 0, sales: 0 }
    );
  }, [reports]);

  const stages: StageData[] = [
    {
      name: "Contatos",
      value: totals.contacts,
      icon: <Users className="h-4 w-4" />,
      color: "bg-blue-500",
      bgColor: "bg-blue-500/20",
    },
    {
      name: "Follow-ups",
      value: totals.followups,
      icon: <Phone className="h-4 w-4" />,
      color: "bg-indigo-500",
      bgColor: "bg-indigo-500/20",
    },
    {
      name: "Reuniões Agendadas",
      value: totals.meetings_scheduled,
      icon: <Calendar className="h-4 w-4" />,
      color: "bg-orange-500",
      bgColor: "bg-orange-500/20",
    },
    {
      name: "Reuniões Realizadas",
      value: totals.meetings_held,
      icon: <Video className="h-4 w-4" />,
      color: "bg-purple-500",
      bgColor: "bg-purple-500/20",
    },
    {
      name: "Vendas",
      value: totals.sales,
      icon: <DollarSign className="h-4 w-4" />,
      color: "bg-emerald-500",
      bgColor: "bg-emerald-500/20",
    },
  ];

  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  const getConversionRate = (currentIndex: number) => {
    if (currentIndex === 0) return "Topo";
    const previousValue = stages[currentIndex - 1].value;
    if (previousValue === 0) return "0%";
    const rate = (stages[currentIndex].value / previousValue) * 100;
    return `${rate.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          Funil de Conversão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, index) => {
          const widthPercent = (stage.value / maxValue) * 100;
          const conversion = getConversionRate(index);

          return (
            <div key={stage.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={`p-1 rounded ${stage.bgColor}`}>
                    {stage.icon}
                  </span>
                  {stage.name}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    index === 0 
                      ? "bg-muted text-muted-foreground" 
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {conversion}
                </span>
              </div>
              <div className="relative h-8 w-full rounded-lg overflow-hidden bg-muted">
                <div
                  className={`absolute inset-y-0 left-0 ${stage.color} rounded-lg transition-all duration-500 flex items-center justify-center`}
                  style={{ width: `${Math.max(widthPercent, stage.value > 0 ? 15 : 0)}%` }}
                >
                  <span className="text-sm font-bold text-white drop-shadow-md">
                    {stage.value.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {totals.contacts === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum dado de relatório disponível ainda
          </p>
        )}
      </CardContent>
    </Card>
  );
}
