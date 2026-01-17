import { DollarSign } from "lucide-react";
import { FunnelData, formatCurrency } from "./types";

interface FunnelBudgetOverviewProps {
  funnel: FunnelData;
}

interface BudgetItem {
  name: string;
  percent: number;
  color: string;
  dotColor: string;
}

export function FunnelBudgetOverview({ funnel }: FunnelBudgetOverviewProps) {
  const total = funnel.predicted_investment || 0;

  const budgetItems: BudgetItem[] = [
    { name: "Venda", percent: funnel.budget_venda_percent || 0, color: "text-green-500", dotColor: "bg-green-500" },
    { name: "Captação", percent: funnel.budget_captacao_percent || 0, color: "text-blue-500", dotColor: "bg-blue-500" },
    { name: "Aquecimento", percent: funnel.budget_aquecimento_percent || 0, color: "text-orange-500", dotColor: "bg-orange-500" },
    { name: "Evento", percent: funnel.budget_evento_percent || 0, color: "text-amber-500", dotColor: "bg-amber-500" },
    { name: "Lembrete", percent: funnel.budget_lembrete_percent || 0, color: "text-yellow-500", dotColor: "bg-yellow-500" },
    { name: "Impulsionar", percent: funnel.budget_impulsionamento_percent || 0, color: "text-pink-500", dotColor: "bg-pink-500" },
  ];

  const getValue = (percent: number) => (total * percent) / 100;

  return (
    <div className="rounded-2xl overflow-hidden border">
      {/* Header com gradiente verde */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <DollarSign className="h-5 w-5" />
          </div>
          <span className="font-medium">Verba Total</span>
        </div>
        <div className="text-4xl font-bold">
          {formatCurrency(total)}
        </div>
      </div>

      {/* Distribuição por etapa */}
      <div className="bg-card p-4">
        <p className="text-xs text-muted-foreground mb-3 font-medium">Distribuição por Etapa</p>
        <div className="grid grid-cols-2 gap-3">
          {budgetItems.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.dotColor}`} />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground">{item.name}</span>
                <div className={`text-sm font-semibold ${item.color}`}>
                  {formatCurrency(getValue(item.percent))} ({item.percent}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
