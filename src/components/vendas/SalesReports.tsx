import { useState, useMemo } from "react";
import { useSales, useCommissions, useInstallments } from "@/hooks/useSales";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/funnel-panel/types";
import { BarChart3, TrendingUp, Users, Download, FileSpreadsheet } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SalesReports() {
  const { data: sales } = useSales();
  const { data: commissions } = useCommissions();
  const { data: installments } = useInstallments();
  
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  
  // Calculate seller performance
  const sellerPerformance = useMemo(() => {
    if (!sales || !commissions || !installments) return [];
    
    const sellerMap = new Map<string, {
      id: string;
      name: string;
      totalSales: number;
      totalRevenue: number;
      commissionReleased: number;
      commissionPending: number;
      commissionSuspended: number;
      overdueInstallments: number;
    }>();
    
    // Filter sales by date range and platform
    const filteredSales = sales.filter(sale => {
      const saleDate = parseISO(sale.sale_date);
      const inDateRange = isWithinInterval(saleDate, {
        start: parseISO(dateRange.start),
        end: parseISO(dateRange.end),
      });
      const matchesPlatform = platformFilter === "all" || sale.platform === platformFilter;
      return inDateRange && matchesPlatform;
    });
    
    // Aggregate by seller
    filteredSales.forEach(sale => {
      const sellerId = sale.seller_id;
      const sellerName = sale.seller?.full_name || 'Desconhecido';
      
      if (!sellerMap.has(sellerId)) {
        sellerMap.set(sellerId, {
          id: sellerId,
          name: sellerName,
          totalSales: 0,
          totalRevenue: 0,
          commissionReleased: 0,
          commissionPending: 0,
          commissionSuspended: 0,
          overdueInstallments: 0,
        });
      }
      
      const seller = sellerMap.get(sellerId)!;
      if (sale.status === 'active') {
        seller.totalSales += 1;
        seller.totalRevenue += Number(sale.total_value);
      }
    });
    
    // Add commission data
    commissions?.forEach(comm => {
      const seller = sellerMap.get(comm.seller_id);
      if (seller) {
        if (comm.status === 'released') {
          seller.commissionReleased += Number(comm.commission_value);
        } else if (comm.status === 'pending') {
          seller.commissionPending += Number(comm.commission_value);
        } else if (comm.status === 'suspended') {
          seller.commissionSuspended += Number(comm.commission_value);
        }
      }
    });
    
    // Count overdue installments
    const saleIds = new Set(filteredSales.map(s => s.id));
    installments?.forEach(inst => {
      if (saleIds.has(inst.sale_id) && inst.status === 'overdue') {
        const sale = sales.find(s => s.id === inst.sale_id);
        if (sale) {
          const seller = sellerMap.get(sale.seller_id);
          if (seller) {
            seller.overdueInstallments += 1;
          }
        }
      }
    });
    
    return Array.from(sellerMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [sales, commissions, installments, dateRange, platformFilter]);
  
  // Calculate totals
  const totals = useMemo(() => {
    return sellerPerformance.reduce((acc, seller) => ({
      totalSales: acc.totalSales + seller.totalSales,
      totalRevenue: acc.totalRevenue + seller.totalRevenue,
      commissionReleased: acc.commissionReleased + seller.commissionReleased,
      commissionPending: acc.commissionPending + seller.commissionPending,
      commissionSuspended: acc.commissionSuspended + seller.commissionSuspended,
    }), {
      totalSales: 0,
      totalRevenue: 0,
      commissionReleased: 0,
      commissionPending: 0,
      commissionSuspended: 0,
    });
  }, [sellerPerformance]);
  
  // Calculate revenue by status
  const revenueByStatus = useMemo(() => {
    if (!installments || !sales) return { received: 0, pending: 0, overdue: 0 };
    
    const saleIds = new Set(
      sales
        .filter(s => {
          const saleDate = parseISO(s.sale_date);
          return isWithinInterval(saleDate, {
            start: parseISO(dateRange.start),
            end: parseISO(dateRange.end),
          }) && (platformFilter === "all" || s.platform === platformFilter);
        })
        .map(s => s.id)
    );
    
    return installments.reduce((acc, inst) => {
      if (!saleIds.has(inst.sale_id)) return acc;
      
      const value = Number(inst.value);
      if (inst.status === 'paid') {
        acc.received += value;
      } else if (inst.status === 'pending') {
        acc.pending += value;
      } else if (inst.status === 'overdue') {
        acc.overdue += value;
      }
      return acc;
    }, { received: 0, pending: 0, overdue: 0 });
  }, [installments, sales, dateRange, platformFilter]);
  
  function exportToCSV() {
    const headers = ['Vendedor', 'Total Vendas', 'Faturamento', 'Comissão Liberada', 'Comissão Pendente', 'Comissão Suspensa', 'Inadimplência'];
    const rows = sellerPerformance.map(s => [
      s.name,
      s.totalSales,
      s.totalRevenue.toFixed(2),
      s.commissionReleased.toFixed(2),
      s.commissionPending.toFixed(2),
      s.commissionSuspended.toFixed(2),
      s.overdueInstallments,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-vendas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium">Data Início</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(d => ({ ...d, start: e.target.value }))}
                className="w-[180px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data Fim</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(d => ({ ...d, end: e.target.value }))}
                className="w-[180px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Plataforma</label>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="hotmart">Hotmart</SelectItem>
                  <SelectItem value="asaas">Asaas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento Bruto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totals.totalSales} vendas no período
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(revenueByStatus.received)}
            </div>
            <p className="text-xs text-muted-foreground">
              Parcelas pagas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {formatCurrency(revenueByStatus.pending)}
            </div>
            <p className="text-xs text-muted-foreground">
              A receber
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Atraso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(revenueByStatus.overdue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Inadimplência
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Commission Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Comissões Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totals.commissionReleased)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Comissões Provisionadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.commissionPending)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Comissões Suspensas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totals.commissionSuspended)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Seller Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Desempenho por Vendedor
          </CardTitle>
          <CardDescription>
            Ranking de vendedores no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>Faturamento</TableHead>
                  <TableHead>Comissão Liberada</TableHead>
                  <TableHead>Comissão Pendente</TableHead>
                  <TableHead>Comissão Suspensa</TableHead>
                  <TableHead>Inadimplência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellerPerformance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum dado encontrado para o período
                    </TableCell>
                  </TableRow>
                ) : (
                  sellerPerformance.map((seller, index) => (
                    <TableRow key={seller.id}>
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "outline"}>
                          {index + 1}º
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{seller.name}</TableCell>
                      <TableCell>{seller.totalSales}</TableCell>
                      <TableCell>{formatCurrency(seller.totalRevenue)}</TableCell>
                      <TableCell className="text-success">
                        {formatCurrency(seller.commissionReleased)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(seller.commissionPending)}
                      </TableCell>
                      <TableCell className="text-destructive">
                        {formatCurrency(seller.commissionSuspended)}
                      </TableCell>
                      <TableCell>
                        {seller.overdueInstallments > 0 ? (
                          <Badge variant="destructive">{seller.overdueInstallments}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-success">0</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
