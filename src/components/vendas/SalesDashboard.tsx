import { useAuth } from "@/contexts/AuthContext";
import { useSales, useCommissionSummary, useInstallments } from "@/hooks/useSales";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/funnel-panel/types";
import { DollarSign, TrendingUp, AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SalesDashboard() {
  const { user } = useAuth();
  const { data: sales, isLoading: salesLoading } = useSales(user?.id);
  const { data: summary, isLoading: summaryLoading } = useCommissionSummary(user?.id);
  const { data: installments, isLoading: installmentsLoading } = useInstallments();
  
  const isLoading = salesLoading || summaryLoading || installmentsLoading;
  
  // Filter installments for current user's sales
  const userInstallments = installments?.filter(
    inst => inst.sale?.seller?.id === user?.id
  ) || [];
  
  const overdueInstallments = userInstallments.filter(
    inst => inst.status === 'overdue' || 
    (inst.status === 'pending' && new Date(inst.due_date) < new Date())
  );
  
  const upcomingInstallments = userInstallments.filter(
    inst => inst.status === 'pending' && new Date(inst.due_date) >= new Date()
  ).slice(0, 5);
  
  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: ptBR });
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Comissão Liberada</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(summary?.totalReleased || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total acumulado
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Comissão do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.currentMonthReleased || 0)}
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {currentMonth}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Comissão Prevista</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {formatCurrency(summary?.totalPending || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando pagamento
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Comissão Suspensa</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(summary?.totalSuspended || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Parcelas em atraso
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Installments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Parcelas em Atraso
            </CardTitle>
            <CardDescription>
              Clientes com pagamentos pendentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overdueInstallments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma parcela em atraso 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {overdueInstallments.slice(0, 5).map((inst) => (
                  <div 
                    key={inst.id} 
                    className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20"
                  >
                    <div>
                      <p className="font-medium">{inst.sale?.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {inst.sale?.product_name} - Parcela {inst.installment_number}/{inst.total_installments}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(inst.value)}</p>
                      <p className="text-xs text-destructive">
                        Venceu em {format(new Date(inst.due_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Upcoming Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              Próximos Pagamentos
            </CardTitle>
            <CardDescription>
              Parcelas com vencimento futuro
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingInstallments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum pagamento futuro
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingInstallments.map((inst) => (
                  <div 
                    key={inst.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{inst.sale?.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {inst.sale?.product_name} - Parcela {inst.installment_number}/{inst.total_installments}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(inst.value)}</p>
                      <p className="text-xs text-muted-foreground">
                        Vence em {format(new Date(inst.due_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent" />
            Minhas Vendas Recentes
          </CardTitle>
          <CardDescription>
            Últimas vendas realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sales?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma venda encontrada
            </p>
          ) : (
            <div className="space-y-3">
              {sales?.slice(0, 5).map((sale) => (
                <div 
                  key={sale.id} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{sale.client_name}</p>
                      <Badge variant={sale.status === 'active' ? 'default' : 'destructive'}>
                        {sale.status === 'active' ? 'Ativa' : 'Cancelada'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {sale.product_name} • {sale.installments_count}x de {formatCurrency(sale.total_value / sale.installments_count)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(sale.total_value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sale.sale_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
