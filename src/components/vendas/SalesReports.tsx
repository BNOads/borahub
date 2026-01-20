import { useState, useMemo } from "react";
import { useSales, useCommissions, useInstallments } from "@/hooks/useSales";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { BarChart3, TrendingUp, Users, Download, FileSpreadsheet, FileText, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Hook to fetch sellers
function useSellers() {
  return useQuery({
    queryKey: ['sellers-for-reports'],
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

export function SalesReports() {
  const { data: sales } = useSales();
  const { data: commissions } = useCommissions();
  const { data: installments } = useInstallments();
  const { data: sellers } = useSellers();
  
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [commissionSort, setCommissionSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'sellerName', direction: 'asc' });
  
  // Calculate seller performance
  const sellerPerformance = useMemo(() => {
    if (!sales || !commissions || !installments) return [];
    
    const sellerMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      totalSales: number;
      totalRevenue: number;
      commissionReleased: number;
      commissionPending: number;
      commissionSuspended: number;
      overdueInstallments: number;
      paidInstallments: number;
      pendingInstallments: number;
      salesDetails: Array<{
        date: string;
        client: string;
        product: string;
        value: number;
        commission: number;
        status: string;
      }>;
    }>();
    
    // Filter sales by date range, platform, and seller
    const filteredSales = sales.filter(sale => {
      if (!sale.seller_id) return false;
      
      const saleDate = parseISO(sale.sale_date);
      const inDateRange = isWithinInterval(saleDate, {
        start: parseISO(dateRange.start),
        end: parseISO(dateRange.end),
      });
      const matchesPlatform = platformFilter === "all" || sale.platform === platformFilter;
      const matchesSeller = sellerFilter === "all" || sale.seller_id === sellerFilter;
      return inDateRange && matchesPlatform && matchesSeller;
    });
    
    // Aggregate by seller
    filteredSales.forEach(sale => {
      const sellerId = sale.seller_id;
      const sellerName = sale.seller?.full_name || 'Desconhecido';
      const sellerEmail = sale.seller?.email || '';
      
      if (!sellerMap.has(sellerId)) {
        sellerMap.set(sellerId, {
          id: sellerId,
          name: sellerName,
          email: sellerEmail,
          totalSales: 0,
          totalRevenue: 0,
          commissionReleased: 0,
          commissionPending: 0,
          commissionSuspended: 0,
          overdueInstallments: 0,
          paidInstallments: 0,
          pendingInstallments: 0,
          salesDetails: [],
        });
      }
      
      const seller = sellerMap.get(sellerId)!;
      if (sale.status === 'active') {
        seller.totalSales += 1;
        seller.totalRevenue += Number(sale.total_value);
        
        // Add sale details
        seller.salesDetails.push({
          date: sale.sale_date,
          client: sale.client_name,
          product: sale.product_name,
          value: Number(sale.total_value),
          commission: Number(sale.total_value) * (Number(sale.commission_percent) / 100),
          status: sale.status,
        });
      }
    });
    
    // Create saleIds set for filtering
    const saleIds = new Set(filteredSales.map(s => s.id));
    
    // Add commission data - ONLY for sales in the filtered period
    commissions?.forEach(comm => {
      // Find the installment and then the sale to check if it's in the filtered set
      const installment = installments?.find(i => i.id === comm.installment_id);
      if (installment && saleIds.has(installment.sale_id)) {
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
      }
    });
    
    // Count installments by status
    installments?.forEach(inst => {
      if (saleIds.has(inst.sale_id)) {
        const sale = sales.find(s => s.id === inst.sale_id);
        if (sale) {
          const seller = sellerMap.get(sale.seller_id);
          if (seller) {
            if (inst.status === 'overdue') {
              seller.overdueInstallments += 1;
            } else if (inst.status === 'paid') {
              seller.paidInstallments += 1;
            } else if (inst.status === 'pending') {
              seller.pendingInstallments += 1;
            }
          }
        }
      }
    });
    
    return Array.from(sellerMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [sales, commissions, installments, dateRange, platformFilter, sellerFilter]);
  
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
  
  // Detailed commissions list - ONLY RELEASED commissions
  const commissionsDetail = useMemo(() => {
    if (!commissions || !installments || !sales) return [];
    
    const saleIds = new Set(
      sales
        .filter(s => {
          if (!s.seller_id) return false;
          const saleDate = parseISO(s.sale_date);
          return isWithinInterval(saleDate, {
            start: parseISO(dateRange.start),
            end: parseISO(dateRange.end),
          }) && (platformFilter === "all" || s.platform === platformFilter)
            && (sellerFilter === "all" || s.seller_id === sellerFilter);
        })
        .map(s => s.id)
    );
    
    return commissions
      .filter(comm => comm.status === 'released') // Only released commissions
      .map(comm => {
        const installment = installments.find(i => i.id === comm.installment_id);
        if (!installment || !saleIds.has(installment.sale_id)) return null;
        
        const sale = sales.find(s => s.id === installment.sale_id);
        if (!sale) return null;
        
        return {
          id: comm.id,
          sellerName: sale.seller?.full_name || 'Desconhecido',
          sellerEmail: sale.seller?.email || '',
          externalId: sale.external_id,
          clientName: sale.client_name,
          productName: sale.product_name,
          installmentNumber: installment.installment_number,
          totalInstallments: installment.total_installments,
          installmentValue: Number(installment.value),
          installmentStatus: installment.status,
          commissionPercent: Number(comm.commission_percent),
          commissionValue: Number(comm.commission_value),
          commissionStatus: comm.status,
          competenceMonth: comm.competence_month,
          releasedAt: comm.released_at,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        sellerName: string;
        sellerEmail: string;
        externalId: string;
        clientName: string;
        productName: string;
        installmentNumber: number;
        totalInstallments: number;
        installmentValue: number;
        installmentStatus: string;
        commissionPercent: number;
        commissionValue: number;
        commissionStatus: string;
        competenceMonth: string;
        releasedAt: string | null;
      }>;
  }, [commissions, installments, sales, dateRange, platformFilter, sellerFilter]);
  
  // Sorted commissions detail
  const sortedCommissionsDetail = useMemo(() => {
    const sorted = [...commissionsDetail];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (commissionSort.column) {
        case 'sellerName':
          comparison = a.sellerName.localeCompare(b.sellerName);
          break;
        case 'externalId':
          comparison = a.externalId.localeCompare(b.externalId);
          break;
        case 'clientName':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'productName':
          comparison = a.productName.localeCompare(b.productName);
          break;
        case 'installmentValue':
          comparison = a.installmentValue - b.installmentValue;
          break;
        case 'commissionValue':
          comparison = a.commissionValue - b.commissionValue;
          break;
        case 'competenceMonth':
          comparison = a.competenceMonth.localeCompare(b.competenceMonth);
          break;
        case 'commissionPercent':
          comparison = a.commissionPercent - b.commissionPercent;
          break;
        default:
          comparison = 0;
      }
      
      return commissionSort.direction === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [commissionsDetail, commissionSort]);
  
  function handleCommissionSort(column: string) {
    setCommissionSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }
  
  // Calculate revenue by status
  const revenueByStatus = useMemo(() => {
    if (!installments || !sales) return { received: 0, pending: 0, overdue: 0 };
    
    const saleIds = new Set(
      sales
        .filter(s => {
          if (!s.seller_id) return false;
          const saleDate = parseISO(s.sale_date);
          return isWithinInterval(saleDate, {
            start: parseISO(dateRange.start),
            end: parseISO(dateRange.end),
          }) && (platformFilter === "all" || s.platform === platformFilter)
            && (sellerFilter === "all" || s.seller_id === sellerFilter);
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
  }, [installments, sales, dateRange, platformFilter, sellerFilter]);
  
  function exportToCSV() {
    const headers = ['Vendedor', 'Email', 'Total Vendas', 'Faturamento', 'Comissão Liberada', 'Comissão Pendente', 'Comissão Suspensa', 'Parcelas Pagas', 'Parcelas Pendentes', 'Inadimplência'];
    const rows = sellerPerformance.map(s => [
      s.name,
      s.email,
      s.totalSales,
      s.totalRevenue.toFixed(2),
      s.commissionReleased.toFixed(2),
      s.commissionPending.toFixed(2),
      s.commissionSuspended.toFixed(2),
      s.paidInstallments,
      s.pendingInstallments,
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
  
  function exportToExcel() {
    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Summary by Seller
    const summaryData = [
      ['RELATÓRIO DE COMISSÕES POR VENDEDOR'],
      [`Período: ${format(parseISO(dateRange.start), 'dd/MM/yyyy')} a ${format(parseISO(dateRange.end), 'dd/MM/yyyy')}`],
      [`Plataforma: ${platformFilter === 'all' ? 'Todas' : platformFilter}`],
      [`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [],
      ['Vendedor', 'Email', 'Qtd Vendas', 'Faturamento (R$)', 'Comissão Liberada (R$)', 'Comissão Pendente (R$)', 'Comissão Suspensa (R$)', 'Total Comissão (R$)', 'Parcelas Pagas', 'Parcelas Pendentes', 'Parcelas Atrasadas'],
      ...sellerPerformance.map(s => [
        s.name,
        s.email,
        s.totalSales,
        s.totalRevenue,
        s.commissionReleased,
        s.commissionPending,
        s.commissionSuspended,
        s.commissionReleased + s.commissionPending + s.commissionSuspended,
        s.paidInstallments,
        s.pendingInstallments,
        s.overdueInstallments,
      ]),
      [],
      ['TOTAIS', '', totals.totalSales, totals.totalRevenue, totals.commissionReleased, totals.commissionPending, totals.commissionSuspended, totals.commissionReleased + totals.commissionPending + totals.commissionSuspended, '', '', ''],
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    summarySheet['!cols'] = [
      { wch: 25 }, // Vendedor
      { wch: 30 }, // Email
      { wch: 12 }, // Qtd Vendas
      { wch: 18 }, // Faturamento
      { wch: 20 }, // Comissão Liberada
      { wch: 20 }, // Comissão Pendente
      { wch: 20 }, // Comissão Suspensa
      { wch: 18 }, // Total Comissão
      { wch: 15 }, // Parcelas Pagas
      { wch: 18 }, // Parcelas Pendentes
      { wch: 18 }, // Parcelas Atrasadas
    ];
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo por Vendedor');
    
    // Sheet 2: Detailed Sales per Seller
    const detailedData: any[][] = [
      ['DETALHAMENTO DE VENDAS POR VENDEDOR'],
      [`Período: ${format(parseISO(dateRange.start), 'dd/MM/yyyy')} a ${format(parseISO(dateRange.end), 'dd/MM/yyyy')}`],
      [],
    ];
    
    sellerPerformance.forEach(seller => {
      detailedData.push([]);
      detailedData.push([`VENDEDOR: ${seller.name}`]);
      detailedData.push([`Email: ${seller.email}`]);
      detailedData.push([`Total: ${seller.totalSales} vendas | Faturamento: R$ ${seller.totalRevenue.toFixed(2)} | Comissão: R$ ${(seller.commissionReleased + seller.commissionPending).toFixed(2)}`]);
      detailedData.push([]);
      detailedData.push(['Data', 'Cliente', 'Produto', 'Valor (R$)', 'Comissão (R$)', 'Status']);
      
      seller.salesDetails.forEach(sale => {
        detailedData.push([
          format(parseISO(sale.date), 'dd/MM/yyyy'),
          sale.client,
          sale.product,
          sale.value,
          sale.commission,
          sale.status === 'active' ? 'Ativa' : 'Cancelada',
        ]);
      });
      
      detailedData.push([]);
    });
    
    const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
    detailedSheet['!cols'] = [
      { wch: 12 }, // Data
      { wch: 30 }, // Cliente
      { wch: 30 }, // Produto
      { wch: 15 }, // Valor
      { wch: 15 }, // Comissão
      { wch: 12 }, // Status
    ];
    
    XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detalhamento');
    
    // Sheet 3: Commission breakdown
    const commissionData: any[][] = [
      ['DETALHAMENTO DE COMISSÕES'],
      [`Período: ${format(parseISO(dateRange.start), 'dd/MM/yyyy')} a ${format(parseISO(dateRange.end), 'dd/MM/yyyy')}`],
      [],
      ['Vendedor', 'Comissão Liberada (R$)', 'Comissão Pendente (R$)', 'Comissão Suspensa (R$)', 'Total (R$)', '% do Total'],
    ];
    
    const totalCommission = totals.commissionReleased + totals.commissionPending + totals.commissionSuspended;
    
    sellerPerformance.forEach(seller => {
      const sellerTotal = seller.commissionReleased + seller.commissionPending + seller.commissionSuspended;
      const percentage = totalCommission > 0 ? ((sellerTotal / totalCommission) * 100).toFixed(1) : '0.0';
      
      commissionData.push([
        seller.name,
        seller.commissionReleased,
        seller.commissionPending,
        seller.commissionSuspended,
        sellerTotal,
        `${percentage}%`,
      ]);
    });
    
    commissionData.push([]);
    commissionData.push(['TOTAL', totals.commissionReleased, totals.commissionPending, totals.commissionSuspended, totalCommission, '100%']);
    
    const commissionSheet = XLSX.utils.aoa_to_sheet(commissionData);
    commissionSheet['!cols'] = [
      { wch: 25 }, // Vendedor
      { wch: 22 }, // Liberada
      { wch: 22 }, // Pendente
      { wch: 22 }, // Suspensa
      { wch: 15 }, // Total
      { wch: 12 }, // %
    ];
    
    XLSX.utils.book_append_sheet(workbook, commissionSheet, 'Comissões');
    
    // Download
    XLSX.writeFile(workbook, `relatorio-comissoes-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data Início</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(d => ({ ...d, start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data Fim</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(d => ({ ...d, end: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Plataforma</Label>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="hotmart">Hotmart</SelectItem>
                  <SelectItem value="asaas">Asaas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Vendedor</Label>
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
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
            <div className="space-y-2">
              <Label className="text-sm font-medium">Exportar</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV} className="flex-1">
                  <FileText className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button variant="default" size="sm" onClick={exportToExcel} className="flex-1">
                  <Download className="h-4 w-4 mr-1" />
                  Excel
                </Button>
              </div>
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
            <CardTitle className="text-sm font-medium">Comissões Liberadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totals.commissionReleased)}
            </div>
            <p className="text-xs text-muted-foreground">Já pagas aos vendedores</p>
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
            <p className="text-xs text-muted-foreground">Aguardando liberação</p>
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
            <p className="text-xs text-muted-foreground">Por inadimplência</p>
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
                  <TableHead className="text-center">Vendas</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Com. Liberada</TableHead>
                  <TableHead className="text-right">Com. Pendente</TableHead>
                  <TableHead className="text-right">Com. Suspensa</TableHead>
                  <TableHead className="text-center">Parc. Pagas</TableHead>
                  <TableHead className="text-center">Parc. Pend.</TableHead>
                  <TableHead className="text-center">Inadimp.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellerPerformance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Nenhum dado encontrado para o período
                    </TableCell>
                  </TableRow>
                ) : (
                  sellerPerformance.map((seller, index) => (
                    <TableRow key={seller.id}>
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "outline"}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{seller.name}</p>
                          <p className="text-xs text-muted-foreground">{seller.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{seller.totalSales}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(seller.totalRevenue)}</TableCell>
                      <TableCell className="text-right text-success">
                        {formatCurrency(seller.commissionReleased)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(seller.commissionPending)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(seller.commissionSuspended)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-success/10 text-success">
                          {seller.paidInstallments}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {seller.pendingInstallments}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
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
      
      {/* Detailed Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detalhamento de Comissões
          </CardTitle>
          <CardDescription>
            Todas as comissões de todas as vendas ({commissionsDetail.length} registros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleCommissionSort('sellerName')}
                  >
                    <div className="flex items-center gap-1">
                      Vendedor
                      {commissionSort.column === 'sellerName' ? (
                        commissionSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleCommissionSort('externalId')}
                  >
                    <div className="flex items-center gap-1">
                      ID Venda
                      {commissionSort.column === 'externalId' ? (
                        commissionSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleCommissionSort('clientName')}
                  >
                    <div className="flex items-center gap-1">
                      Cliente
                      {commissionSort.column === 'clientName' ? (
                        commissionSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleCommissionSort('productName')}
                  >
                    <div className="flex items-center gap-1">
                      Produto
                      {commissionSort.column === 'productName' ? (
                        commissionSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Parcela</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleCommissionSort('installmentValue')}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Valor Parcela
                      {commissionSort.column === 'installmentValue' ? (
                        commissionSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleCommissionSort('commissionPercent')}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      %
                      {commissionSort.column === 'commissionPercent' ? (
                        commissionSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleCommissionSort('commissionValue')}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Comissão
                      {commissionSort.column === 'commissionValue' ? (
                        commissionSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleCommissionSort('competenceMonth')}
                  >
                    <div className="flex items-center gap-1">
                      Competência
                      {commissionSort.column === 'competenceMonth' ? (
                        commissionSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCommissionsDetail.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhuma comissão liberada encontrada para o período
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCommissionsDetail.map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{comm.sellerName}</p>
                          <p className="text-xs text-muted-foreground">{comm.sellerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{comm.externalId}</TableCell>
                      <TableCell className="text-sm">{comm.clientName}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate" title={comm.productName}>
                        {comm.productName}
                      </TableCell>
                      <TableCell className="text-center">
                        {comm.totalInstallments === 1 ? (
                          <Badge variant="outline" className="bg-accent/10 text-accent text-xs">À Vista</Badge>
                        ) : (
                          <span className="text-sm">{comm.installmentNumber}/{comm.totalInstallments}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(comm.installmentValue)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {comm.commissionPercent}%
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {formatCurrency(comm.commissionValue)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(parseISO(comm.competenceMonth), 'MMM/yy', { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Commission Summary at bottom */}
          {sortedCommissionsDetail.length > 0 && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 justify-end">
              <div className="text-sm">
                <span className="text-muted-foreground">Total de Comissões Liberadas: </span>
                <span className="font-bold text-success text-lg">
                  {formatCurrency(sortedCommissionsDetail.reduce((sum, c) => sum + c.commissionValue, 0))}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Quantidade: </span>
                <span className="font-bold">
                  {sortedCommissionsDetail.length} comissões
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
