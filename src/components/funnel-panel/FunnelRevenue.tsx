import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, Loader2, Package } from "lucide-react";
import { useFunnelRevenue, useFunnelProducts } from "@/hooks/useFunnelProducts";
import { formatCurrency, FunnelData } from "./types";

interface FunnelRevenueProps {
  funnel: FunnelData;
}

type PeriodOption = "7d" | "30d" | "90d" | "funnel" | "all";

export function FunnelRevenue({ funnel }: FunnelRevenueProps) {
  const [period, setPeriod] = useState<PeriodOption>("30d");

  const { data: linkedProducts, isLoading: loadingProducts } = useFunnelProducts(funnel.id);

  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    let start: Date | undefined;
    let end: Date | undefined = today;

    switch (period) {
      case "7d":
        start = new Date(today);
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start = new Date(today);
        start.setDate(start.getDate() - 30);
        break;
      case "90d":
        start = new Date(today);
        start.setDate(start.getDate() - 90);
        break;
      case "funnel":
        start = funnel.captacao_start ? new Date(funnel.captacao_start) : undefined;
        end = funnel.fechamento_date ? new Date(funnel.fechamento_date) : today;
        break;
      case "all":
        start = undefined;
        end = undefined;
        break;
    }

    return {
      startDate: start?.toISOString().split("T")[0],
      endDate: end?.toISOString().split("T")[0],
    };
  }, [period, funnel.captacao_start, funnel.fechamento_date]);

  const { data: revenue, isLoading: loadingRevenue } = useFunnelRevenue(
    funnel.id,
    startDate,
    endDate
  );

  const hasLinkedProducts = (linkedProducts?.length || 0) > 0;

  if (loadingProducts) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Faturamento dos Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasLinkedProducts) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Faturamento dos Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Package className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Vincule produtos a este funil para ver o faturamento.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Acesse a aba Configuração → Produtos Vinculados
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Faturamento dos Produtos
          </CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="funnel">Período do Funil</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loadingRevenue ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Valor Principal */}
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(revenue?.total || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {linkedProducts?.length} produto{linkedProducts?.length !== 1 ? "s" : ""} vinculado{linkedProducts?.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-lg font-semibold">{revenue?.count || 0}</span>
                <span className="text-sm">vendas</span>
              </div>
            </div>

            {/* Comparação com período anterior */}
            {period !== "all" && period !== "funnel" && revenue?.previousTotal !== undefined && (
              <div className="flex items-center gap-2 pt-2 border-t">
                {revenue.growthPercent > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      +{revenue.growthPercent}%
                    </span>
                  </>
                ) : revenue.growthPercent < 0 ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive font-medium">
                      {revenue.growthPercent}%
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Sem variação
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  vs período anterior
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
