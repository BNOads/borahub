import { useAuth } from "@/contexts/AuthContext";
import { useSales, useCommissionSummary, useInstallments } from "@/hooks/useSales";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/funnel-panel/types";
import { DollarSign, TrendingUp, AlertTriangle, Clock, CheckCircle, ShoppingCart, BarChart3, Trophy, Package, Filter, Calendar, User } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Hook to fetch all sellers (profiles)
function useSellers() {
  return useQuery({
    queryKey: ['sellers-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
  });
}

type PeriodFilter = 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'custom';

export function SalesDashboard() {
  const { user, profile, isAdmin } = useAuth();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [productSortBy, setProductSortBy] = useState<'value' | 'count'>('value');
  const [productPlatformFilter, setProductPlatformFilter] = useState<'all' | 'hotmart' | 'asaas'>('all');
  const [productPage, setProductPage] = useState(1);
  const PRODUCTS_PER_PAGE = 5;
  
  // For admin/manager/financeiro, show all data; for sellers, show only their own
  const isAdminOrManager = isAdmin || 
                           profile?.job_title?.toLowerCase().includes('gerente') ||
                           profile?.job_title?.toLowerCase().includes('financeiro');
  
  const sellerId = isAdminOrManager ? undefined : user?.id;
  
  const { data: sales, isLoading: salesLoading } = useSales(sellerId);
  const { data: summary, isLoading: summaryLoading } = useCommissionSummary(sellerId);
  const { data: installments, isLoading: installmentsLoading } = useInstallments();
  const { data: sellers } = useSellers();
  
  const isLoading = salesLoading || summaryLoading || installmentsLoading;
  
  // Get date range based on period filter
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodFilter) {
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last_3_months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'last_6_months':
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      case 'this_year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        if (customStartDate && customEndDate) {
          return { start: parseISO(customStartDate), end: parseISO(customEndDate) };
        }
        return null;
      default:
        return null;
    }
  }, [periodFilter, customStartDate, customEndDate]);
  
  // Filter sales based on period and seller
  const filteredSales = useMemo(() => {
    if (!sales) return [];
    
    return sales.filter(sale => {
      // Period filter
      if (dateRange) {
        const saleDate = parseISO(sale.sale_date);
        if (!isWithinInterval(saleDate, { start: dateRange.start, end: dateRange.end })) {
          return false;
        }
      }
      
      // Seller filter (only for admin/manager)
      if (isAdminOrManager && sellerFilter !== 'all' && sale.seller_id !== sellerFilter) {
        return false;
      }
      
      return true;
    });
  }, [sales, dateRange, sellerFilter, isAdminOrManager]);
  
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
  
  // Calculate stats from filtered sales
  const totalSales = filteredSales.length;
  const activeSales = filteredSales.filter(s => s.status === 'active').length;
  const totalValue = filteredSales.reduce((sum, s) => sum + Number(s.total_value), 0);
  const paidInstallments = userInstallments.filter(i => i.status === 'paid').length;
  const pendingInstallments = userInstallments.filter(i => i.status === 'pending').length;
  
  // Seller ranking
  const sellerRanking = useMemo(() => {
    if (!filteredSales.length) return [];
    
    const sellerStats = new Map<string, { 
      id: string; 
      name: string; 
      totalValue: number; 
      salesCount: number 
    }>();
    
    filteredSales.forEach(sale => {
      if (sale.status !== 'active' || !sale.seller_id) return;
      
      const sellerId = sale.seller_id;
      const sellerName = (sale as any).seller?.full_name || 'Vendedor';
      
      if (!sellerStats.has(sellerId)) {
        sellerStats.set(sellerId, { 
          id: sellerId, 
          name: sellerName, 
          totalValue: 0, 
          salesCount: 0 
        });
      }
      
      const stats = sellerStats.get(sellerId)!;
      stats.totalValue += Number(sale.total_value);
      stats.salesCount += 1;
    });
    
    return Array.from(sellerStats.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  }, [filteredSales]);
  
  // Product ranking with platform filter
  const productRankingData = useMemo(() => {
    if (!filteredSales.length) return [];
    
    const productStats = new Map<string, { 
      name: string; 
      totalValue: number; 
      salesCount: number;
      platform: string;
    }>();
    
    filteredSales.forEach(sale => {
      if (sale.status !== 'active') return;
      
      // Apply platform filter
      if (productPlatformFilter !== 'all' && sale.platform !== productPlatformFilter) return;
      
      const productName = sale.product_name;
      
      if (!productStats.has(productName)) {
        productStats.set(productName, { 
          name: productName, 
          totalValue: 0, 
          salesCount: 0,
          platform: sale.platform,
        });
      }
      
      const stats = productStats.get(productName)!;
      stats.totalValue += Number(sale.total_value);
      stats.salesCount += 1;
    });
    
    return Array.from(productStats.values());
  }, [filteredSales, productPlatformFilter]);
  
  // Sorted and paginated product ranking
  const productRanking = useMemo(() => {
    const sorted = [...productRankingData].sort((a, b) => 
      productSortBy === 'value' 
        ? b.totalValue - a.totalValue 
        : b.salesCount - a.salesCount
    );
    return sorted;
  }, [productRankingData, productSortBy]);
  
  const paginatedProducts = useMemo(() => {
    const startIndex = (productPage - 1) * PRODUCTS_PER_PAGE;
    return productRanking.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [productRanking, productPage, PRODUCTS_PER_PAGE]);
  
  const totalProductPages = Math.ceil(productRanking.length / PRODUCTS_PER_PAGE);
  
  // Calculate sales by month for chart (last 6 months)
  const salesByMonth = useMemo(() => {
    if (!filteredSales.length) return [];
    
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM', { locale: ptBR });
      
      const monthSales = filteredSales.filter(sale => {
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
  }, [filteredSales]);

  const getRankPosition = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}º`;
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Period Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Período
              </Label>
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período</SelectItem>
                  <SelectItem value="this_month">Este mês</SelectItem>
                  <SelectItem value="last_month">Mês passado</SelectItem>
                  <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
                  <SelectItem value="last_6_months">Últimos 6 meses</SelectItem>
                  <SelectItem value="this_year">Este ano</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Custom date range */}
            {periodFilter === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Data inicial</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Data final</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
            
            {/* Seller Filter (only for admin/manager) */}
            {isAdminOrManager && periodFilter !== 'custom' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  Vendedor
                </Label>
                <Select value={sellerFilter} onValueChange={setSellerFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os vendedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os vendedores</SelectItem>
                    {sellers?.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Seller filter when custom dates are shown */}
            {isAdminOrManager && periodFilter === 'custom' && (
              <div className="space-y-2 md:col-span-3">
                <Label className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  Vendedor
                </Label>
                <Select value={sellerFilter} onValueChange={setSellerFilter}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Todos os vendedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os vendedores</SelectItem>
                    {sellers?.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
      
      {/* Rankings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seller Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranking de Vendedores
            </CardTitle>
            <CardDescription>
              Por faturamento e quantidade de vendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sellerRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma venda com vendedor associado
              </p>
            ) : (
              <div className="space-y-3">
                {sellerRanking.map((seller, index) => (
                  <div 
                    key={seller.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                      index === 1 ? 'bg-slate-300/10 border-slate-400/30' :
                      index === 2 ? 'bg-amber-700/10 border-amber-700/30' :
                      'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold min-w-[2rem]">
                        {getRankPosition(index)}
                      </span>
                      <div>
                        <p className="font-medium">{seller.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {seller.salesCount} {seller.salesCount === 1 ? 'venda' : 'vendas'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-accent">{formatCurrency(seller.totalValue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Product Ranking */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-accent" />
                  Ranking de Produtos
                </CardTitle>
                <CardDescription>
                  {productRanking.length} produtos encontrados
                </CardDescription>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t mt-3">
              {/* Platform Filter */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                <button
                  onClick={() => { setProductPlatformFilter('all'); setProductPage(1); }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    productPlatformFilter === 'all'
                      ? 'bg-background shadow-sm font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => { setProductPlatformFilter('hotmart'); setProductPage(1); }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5 ${
                    productPlatformFilter === 'hotmart'
                      ? 'bg-warning text-warning-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {productPlatformFilter !== 'hotmart' && <span className="w-2 h-2 rounded-full bg-warning" />}
                  Hotmart
                </button>
                <button
                  onClick={() => { setProductPlatformFilter('asaas'); setProductPage(1); }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5 ${
                    productPlatformFilter === 'asaas'
                      ? 'bg-primary text-primary-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {productPlatformFilter !== 'asaas' && <span className="w-2 h-2 rounded-full bg-primary" />}
                  Asaas
                </button>
              </div>
              
              {/* Sort Toggle */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                <button
                  onClick={() => { setProductSortBy('value'); setProductPage(1); }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5 ${
                    productSortBy === 'value'
                      ? 'bg-accent text-accent-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  Faturamento
                </button>
                <button
                  onClick={() => { setProductSortBy('count'); setProductPage(1); }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5 ${
                    productSortBy === 'count'
                      ? 'bg-accent text-accent-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Quantidade
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {productRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma venda encontrada
              </p>
            ) : (
              <div className="space-y-3">
                {paginatedProducts.map((product, index) => {
                  const globalIndex = (productPage - 1) * PRODUCTS_PER_PAGE + index;
                  return (
                    <div 
                      key={product.name} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        globalIndex === 0 && productPage === 1 ? 'bg-accent/10 border-accent/30' :
                        'bg-muted/30 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold min-w-[2rem]">
                          {getRankPosition(globalIndex)}
                        </span>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.salesCount} {product.salesCount === 1 ? 'venda' : 'vendas'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-accent">{formatCurrency(product.totalValue)}</p>
                      </div>
                    </div>
                  );
                })}
                
                {/* Pagination */}
                {totalProductPages > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Página {productPage} de {totalProductPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setProductPage(p => Math.max(1, p - 1))}
                        disabled={productPage === 1}
                        className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))}
                        disabled={productPage === totalProductPages}
                        className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próximo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
          {filteredSales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma venda encontrada
            </p>
          ) : (
            <div className="space-y-3">
              {filteredSales.slice(0, 5).map((sale) => (
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