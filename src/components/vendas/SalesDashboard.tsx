import { useAuth } from "@/contexts/AuthContext";
import { useSales, useCommissionSummary, useInstallments } from "@/hooks/useSales";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/funnel-panel/types";
import { DollarSign, TrendingUp, AlertTriangle, Clock, CheckCircle, ShoppingCart, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function SalesDashboard() {
  const { user, profile } = useAuth();
  
  // For admin/manager, show all data; for sellers, show only their own
  const isAdminOrManager = profile?.job_title?.toLowerCase().includes('admin') || 
                           profile?.job_title?.toLowerCase().includes('gerente') ||
                           profile?.job_title?.toLowerCase().includes('financeiro');
  
  const sellerId = isAdminOrManager ? undefined : user?.id;
  
  const { data: sales, isLoading: salesLoading } = useSales(sellerId);
  const { data: summary, isLoading: summaryLoading } = useCommissionSummary(sellerId);
  const { data: installments, isLoading: installmentsLoading } = useInstallments();
  
  const isLoading = salesLoading || summaryLoading || installmentsLoading;
  
  // Filter installments based on role
  const userInstallments = isAdminOrManager 
    ? installments || []
    : installments?.filter(inst => inst.sale?.seller?.id === user?.id) || [];
  
  const overdueInstallments = userInstallments.filter(
    inst => inst.status === 'overdue' || 
    (inst.status === 'pending' && new Date(inst.due_date) < new Date())
  );
  
  const upcomingInstallments = userInstallments.filter(
    inst => inst.status === 'pending' && new Date(inst.due_date) >= new Date()
  ).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 5);
  
  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: ptBR });
  
  // Calculate additional stats for admin view
  const totalSales = sales?.length || 0;
  const activeSales = sales?.filter(s => s.status === 'active').length || 0;
  const totalValue = sales?.reduce((sum, s) => sum + Number(s.total_value), 0) || 0;
  const paidInstallments = userInstallments.filter(i => i.status === 'paid').length;
  const pendingInstallments = userInstallments.filter(i => i.status === 'pending').length;
  
  // Calculate sales by month for chart (last 6 months)
  const salesByMonth = useMemo(() => {
    if (!sales?.length) return [];
    
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM', { locale: ptBR });
      
      const monthSales = sales.filter(sale => {
        const saleDate = parseISO(sale.sale_date);
        return format(saleDate, 'yyyy-MM') === monthKey && sale.status === 'active';
      });
      
      const total = monthSales.reduce((sum, s) => sum + Number(s.total_value), 0);
      const count = monthSales.length;
      
      months.push({
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        total,
        count,
      });
    }
    
    return months;
  }, [sales]);
  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total em Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalSales} vendas ({activeSales} ativas)
            </p>
          </CardContent>
        </Card>
        
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
              {pendingInstallments} parcelas pendentes
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-4">
            <div className="text-xl font-bold text-success">{paidInstallments}</div>
            <p className="text-xs text-muted-foreground">Parcelas Pagas</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="pt-4">
            <div className="text-xl font-bold text-warning">{pendingInstallments}</div>
            <p className="text-xs text-muted-foreground">Parcelas Pendentes</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-4">
            <div className="text-xl font-bold text-destructive">{overdueInstallments.length}</div>
            <p className="text-xs text-muted-foreground">Parcelas Atrasadas</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="text-xl font-bold text-destructive">
              {formatCurrency(summary?.totalSuspended || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Comissão Suspensa</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Sales Chart by Month */}
      {salesByMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              Vendas por Mês
            </CardTitle>
            <CardDescription>
              Faturamento dos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByMonth} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    className="fill-muted-foreground"
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                            <p className="font-medium">{data.month}</p>
                            <p className="text-sm text-accent">{formatCurrency(data.total)}</p>
                            <p className="text-xs text-muted-foreground">{data.count} vendas</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="total" 
                    radius={[4, 4, 0, 0]}
                    className="fill-accent"
                  >
                    {salesByMonth.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        className={index === salesByMonth.length - 1 ? "fill-accent" : "fill-accent/70"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
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
            Vendas Recentes
          </CardTitle>
          <CardDescription>
            Últimas vendas cadastradas
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
