import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Receipt, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useFunnelMatchedSales } from "@/hooks/useFunnelMatchedSales";
import { formatCurrency } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FunnelMatchedSalesProps {
  funnelId: string;
}

export function FunnelMatchedSales({ funnelId }: FunnelMatchedSalesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: matchedSales, isLoading } = useFunnelMatchedSales(funnelId);

  const totalValue = matchedSales?.reduce((sum, s) => sum + s.total_value, 0) || 0;

  // Agrupar por produto que fez o match
  const groupedByProduct = matchedSales?.reduce((acc, sale) => {
    const key = sale.matched_by;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(sale);
    return acc;
  }, {} as Record<string, typeof matchedSales>) || {};

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Vendas Associadas (Asaas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Vendas Associadas (Asaas)
              {matchedSales && matchedSales.length > 0 && (
                <Badge variant="secondary">{matchedSales.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalValue)}
              </span>
              <CollapsibleTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-1">
                  {isOpen ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Ver vendas
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {!matchedSales || matchedSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma venda foi associada automaticamente a este funil.
                <br />
                <span className="text-xs">
                  Vincule produtos na seção acima para capturar vendas do Asaas.
                </span>
              </p>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {Object.entries(groupedByProduct).map(([productName, sales]) => (
                    <div key={productName} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Match: {productName}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {sales?.length} vendas • {formatCurrency(sales?.reduce((s, v) => s + v.total_value, 0) || 0)}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {sales?.map((sale) => (
                          <div
                            key={sale.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-medium truncate" title={sale.product_name}>
                                {sale.product_name.replace(/\n/g, ' ')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {sale.client_name || "Cliente não identificado"} •{" "}
                                {format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                              {formatCurrency(sale.total_value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
