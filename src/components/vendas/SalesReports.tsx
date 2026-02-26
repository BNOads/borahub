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
import { BarChart3, TrendingUp, Users, Download, FileSpreadsheet, FileText, ArrowUpDown, ArrowUp, ArrowDown, Info, Calendar, CalendarClock, Search } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [productFilter, setProductFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [commissionSort, setCommissionSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'sellerName', direction: 'asc' });
  
  // Get unique product names for filter
  const uniqueProducts = useMemo(() => {
    if (!sales) return [];
    const productNames = new Set(sales.map(s => s.product_name));
    return Array.from(productNames).sort();
  }, [sales]);
  
  // Calculate seller performance based on COMMISSION COMPETENCE MONTH (not sale date)
  // This ensures cards and detail table show consistent data
  const sellerPerformance = useMemo(() => {
    if (!sales || !commissions || !installments) return [];
    
    const rangeStart = startOfMonth(parseISO(dateRange.start));
    const rangeEnd = endOfMonth(parseISO(dateRange.end));
    
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
    
    // Track which sales we've already counted (to avoid duplicates)
    const countedSales = new Set<string>();
    
    // Build performance based on commissions with competence in range
    commissions.forEach((comm: any) => {
      const installment = comm.installment;
      const sale = installment?.sale;
      const seller = comm.seller;
      
      if (!installment || !sale || !comm.seller_id) return;
      
      // Check if commission competence is in date range
      const inCompetenceRange = isWithinInterval(parseISO(comm.competence_month), {
        start: rangeStart,
        end: rangeEnd,
      });
      
      if (!inCompetenceRange) return;
      
      // Apply filters
      const matchesPlatform = platformFilter === "all" || sale.platform === platformFilter;
      const matchesSeller = sellerFilter === "all" || comm.seller_id === sellerFilter;
      const matchesProduct = productFilter === "all" || sale.product_name === productFilter;
      
      if (!matchesPlatform || !matchesSeller || !matchesProduct) return;
      
      const sellerId = comm.seller_id;
      const sellerName = seller?.full_name || 'Desconhecido';
      const sellerEmail = seller?.email || '';
      
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
      
      const sellerData = sellerMap.get(sellerId)!;
      
      // Count sales only once per sale
      if (!countedSales.has(sale.id) && sale.status === 'active') {
        countedSales.add(sale.id);
        sellerData.totalSales += 1;
        sellerData.totalRevenue += Number(sale.total_value);
        
        sellerData.salesDetails.push({
          date: sale.sale_date,
          client: sale.client_name,
          product: sale.product_name,
          value: Number(sale.total_value),
          commission: Number(sale.total_value) * (Number(sale.commission_percent) / 100),
          status: sale.status,
        });
      }
      
      // Add commission values
      if (comm.status === 'released') {
        sellerData.commissionReleased += Number(comm.commission_value);
      } else if (comm.status === 'pending') {
        sellerData.commissionPending += Number(comm.commission_value);
      } else if (comm.status === 'suspended') {
        sellerData.commissionSuspended += Number(comm.commission_value);
      }
      
      // Count installment statuses
      if (installment.status === 'overdue') {
        sellerData.overdueInstallments += 1;
      } else if (installment.status === 'paid') {
        sellerData.paidInstallments += 1;
      } else if (installment.status === 'pending') {
        sellerData.pendingInstallments += 1;
      }
    });
    
    return Array.from(sellerMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [sales, commissions, installments, dateRange, platformFilter, sellerFilter, productFilter]);
  
  // Calculate totals from sellerPerformance (for sales/revenue)
  const salesTotals = useMemo(() => {
    return sellerPerformance.reduce((acc, seller) => ({
      totalSales: acc.totalSales + seller.totalSales,
      totalRevenue: acc.totalRevenue + seller.totalRevenue,
    }), {
      totalSales: 0,
      totalRevenue: 0,
    });
  }, [sellerPerformance]);
  
  // Detailed commissions list - ALL commissions (not just released)
  // NOTE: We build this list primarily from `useCommissions()` data (which already includes
  // the related installment + sale). This avoids missing rows when other queries are filtered
  // differently (ex.: a paid installment exists, but sales/installments lists are not in sync).
  const commissionsDetail = useMemo(() => {
    if (!commissions) return [];

    const rangeStart = startOfMonth(parseISO(dateRange.start));
    const rangeEnd = endOfMonth(parseISO(dateRange.end));

    return commissions
      .map((comm: any) => {
        const installment = comm.installment;
        const sale = installment?.sale;
        const seller = comm.seller;

        if (!installment || !sale) return null;

        const inCompetenceRange = isWithinInterval(parseISO(comm.competence_month), {
          start: rangeStart,
          end: rangeEnd,
        });

        const matchesPlatform = platformFilter === "all" || sale.platform === platformFilter;
        const matchesSeller = sellerFilter === "all" || comm.seller_id === sellerFilter;
        const matchesProduct = productFilter === "all" || sale.product_name === productFilter;

        if (!inCompetenceRange || !matchesPlatform || !matchesSeller || !matchesProduct) return null;

        return {
          id: comm.id,
          sellerName: seller?.full_name || "Desconhecido",
          sellerEmail: seller?.email || "",
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
  }, [commissions, dateRange, platformFilter, sellerFilter, productFilter]);
  
  // Calculate commission totals from commissionsDetail to match the detail table exactly
  const commissionTotals = useMemo(() => {
    return commissionsDetail.reduce((acc, comm) => {
      if (comm.commissionStatus === 'released') {
        acc.released += comm.commissionValue;
      } else if (comm.commissionStatus === 'pending') {
        acc.pending += comm.commissionValue;
      } else if (comm.commissionStatus === 'suspended') {
        acc.suspended += comm.commissionValue;
      }
      return acc;
    }, { released: 0, pending: 0, suspended: 0 });
  }, [commissionsDetail]);
  
  // Unified totals object for backward compatibility
  const totals = useMemo(() => ({
    totalSales: salesTotals.totalSales,
    totalRevenue: salesTotals.totalRevenue,
    commissionReleased: commissionTotals.released,
    commissionPending: commissionTotals.pending,
    commissionSuspended: commissionTotals.suspended,
  }), [salesTotals, commissionTotals]);
  
  // Sorted and searched commissions detail
  const sortedCommissionsDetail = useMemo(() => {
    let filtered = [...commissionsDetail];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.sellerName.toLowerCase().includes(term) ||
        c.clientName.toLowerCase().includes(term) ||
        c.productName.toLowerCase().includes(term) ||
        c.externalId.toLowerCase().includes(term)
      );
    }
    
    filtered.sort((a, b) => {
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
    
    return filtered;
  }, [commissionsDetail, commissionSort, searchTerm]);
  
  function handleCommissionSort(column: string) {
    setCommissionSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }
  
  // Calculate revenue by status - based on COMMISSION COMPETENCE MONTH
  // This ensures consistency with the cards and detail table
  const revenueByStatus = useMemo(() => {
    if (!commissions) return { received: 0, pending: 0, overdue: 0 };
    
    const rangeStart = startOfMonth(parseISO(dateRange.start));
    const rangeEnd = endOfMonth(parseISO(dateRange.end));
    
    // Track installments we've already counted to avoid duplicates
    const countedInstallments = new Set<string>();
    
    return commissions.reduce((acc: { received: number; pending: number; overdue: number }, comm: any) => {
      const installment = comm.installment;
      const sale = installment?.sale;
      
      if (!installment || !sale || !comm.seller_id) return acc;
      
      // Check if commission competence is in date range
      const inCompetenceRange = isWithinInterval(parseISO(comm.competence_month), {
        start: rangeStart,
        end: rangeEnd,
      });
      
      if (!inCompetenceRange) return acc;
      
      // Apply filters
      const matchesPlatform = platformFilter === "all" || sale.platform === platformFilter;
      const matchesSeller = sellerFilter === "all" || comm.seller_id === sellerFilter;
      const matchesProduct = productFilter === "all" || sale.product_name === productFilter;
      
      if (!matchesPlatform || !matchesSeller || !matchesProduct) return acc;
      
      // Only count each installment once
      if (countedInstallments.has(installment.id)) return acc;
      countedInstallments.add(installment.id);
      
      const value = Number(installment.value);
      if (installment.status === 'paid') {
        acc.received += value;
      } else if (installment.status === 'pending') {
        acc.pending += value;
      } else if (installment.status === 'overdue') {
        acc.overdue += value;
      }
      return acc;
    }, { received: 0, pending: 0, overdue: 0 });
  }, [commissions, dateRange, platformFilter, sellerFilter, productFilter]);
  
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cliente, produto, vendedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
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
              <Label className="text-sm font-medium">Produto</Label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {uniqueProducts.map((product) => (
                    <SelectItem key={product} value={product}>
                      {product.length > 25 ? product.substring(0, 25) + '...' : product}
                    </SelectItem>
                  ))}
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
      
      {/* Summary Cards - Faturamento (por competência) */}
      <TooltipProvider>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>Valores calculados por <strong>mês de competência</strong> das parcelas</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Os valores abaixo são calculados com base no mês de competência (vencimento/pagamento) das parcelas, não pela data da venda original. Isso garante consistência contábil.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  Faturamento Bruto
                  <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                    <Calendar className="h-2.5 w-2.5 mr-0.5" />
                    Venda
                  </Badge>
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
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  Recebido
                  <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                    <CalendarClock className="h-2.5 w-2.5 mr-0.5" />
                    Competência
                  </Badge>
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
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  Pendente
                  <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                    <CalendarClock className="h-2.5 w-2.5 mr-0.5" />
                    Competência
                  </Badge>
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
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  Em Atraso
                  <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                    <CalendarClock className="h-2.5 w-2.5 mr-0.5" />
                    Competência
                  </Badge>
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
        </div>
      </TooltipProvider>
      
      {/* Commission Summary - por competência */}
      <TooltipProvider>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>Comissões calculadas por <strong>mês de competência</strong></span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>As comissões são vinculadas ao mês de competência da parcela correspondente. Isso permite uma visão contábil precisa de quanto foi gerado em comissões para cada período.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
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
        </div>
      </TooltipProvider>
      
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
