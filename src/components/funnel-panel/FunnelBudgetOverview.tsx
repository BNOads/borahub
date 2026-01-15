import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelData, formatCurrency } from "./types";

interface FunnelBudgetOverviewProps {
  funnel: FunnelData;
}

interface BudgetItem {
  name: string;
  percent: number;
  color: string;
}

export function FunnelBudgetOverview({ funnel }: FunnelBudgetOverviewProps) {
  const total = funnel.predicted_investment || 0;

  const budgetItems: BudgetItem[] = [
    { name: "Captação", percent: funnel.budget_captacao_percent || 0, color: "bg-blue-500" },
    { name: "Aquecimento", percent: funnel.budget_aquecimento_percent || 0, color: "bg-orange-500" },
    { name: "Evento", percent: funnel.budget_evento_percent || 0, color: "bg-purple-500" },
    { name: "Venda", percent: funnel.budget_venda_percent || 0, color: "bg-green-500" },
    { name: "Lembrete", percent: funnel.budget_lembrete_percent || 0, color: "bg-yellow-500" },
    { name: "Impulsionamento", percent: funnel.budget_impulsionamento_percent || 0, color: "bg-pink-500" },
  ];

  const totalPercent = budgetItems.reduce((sum, item) => sum + item.percent, 0);
  const getValue = (percent: number) => (total * percent) / 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span>Distribuição de Verba</span>
          <span className="text-lg font-bold text-accent">
            {formatCurrency(total)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgetItems.map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-accent">{item.percent}%</span>
                <span className="text-muted-foreground text-xs">
                  ({formatCurrency(getValue(item.percent))})
                </span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${item.color} transition-all`}
                style={{ width: `${item.percent}%` }}
              />
            </div>
          </div>
        ))}

        {total > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total Alocado</span>
              <span className={`font-bold ${
                totalPercent === 100
                  ? "text-green-500"
                  : totalPercent > 100
                  ? "text-red-500"
                  : "text-yellow-500"
              }`}>
                {totalPercent}% ({formatCurrency((total * totalPercent) / 100)})
              </span>
            </div>
            {totalPercent !== 100 && (
              <p className="text-xs text-muted-foreground mt-1">
                {totalPercent < 100
                  ? `Faltam ${100 - totalPercent}% para alocar`
                  : `${totalPercent - 100}% acima do orçamento`}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
