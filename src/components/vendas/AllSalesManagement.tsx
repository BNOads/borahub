import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/components/funnel-panel/types";
import { 
  Search, 
  ShoppingCart, 
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Download,
  Copy,
  FileDown,
  CalendarIcon,
  X
} from "lucide-react";
import { format, formatDistanceToNow, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SaleDetailsSheet } from "./SaleDetailsSheet";
import { DateRange } from "react-day-picker";

type SortField = "transaction" | "client_name" | "product_name" | "total_value" | "sale_date" | "seller_name" | "platform";
type SortDirection = "asc" | "desc";

interface DbSale {
  id: string;
  external_id: string;
  client_name: string;
  client_email: string | null;
  product_name: string;
  total_value: number;
  installments_count: number;
  sale_date: string;
  status: string;
  platform: string;
  seller_id: string | null;
  funnel_source: string | null;
  tracking_source: string | null;
  tracking_source_sck: string | null;
  tracking_external_code: string | null;
  seller?: {
    full_name: string;
    display_name: string | null;
  } | null;
}

function useAllSales() {
  return useQuery({
    queryKey: ["all-sales-db"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          external_id,
          client_name,
          client_email,
          product_name,
          total_value,
          installments_count,
          sale_date,
          status,
          platform,
          seller_id,
          funnel_source,
          tracking_source,
          tracking_source_sck,
          tracking_external_code,
          seller:profiles!sales_seller_id_fkey(full_name, display_name)
        `)
        .in("platform", ["hotmart", "asaas"])
        .order("sale_date", { ascending: false });
      
      if (error) throw error;
      return data as DbSale[];
    },
  });
}

function useLastSync() {
  return useQuery({
    queryKey: ["last-all-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("csv_imports")
        .select("created_at, platform, records_created, records_updated, records_processed")
        .in("platform", ["hotmart", "asaas"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });
}

export function AllSalesManagement() {
  const { profile } = useAuth();
  const { data: sales, isLoading, refetch } = useAllSales();
  const { data: lastSync, refetch: refetchLastSync } = useLastSync();
  const queryClient = useQueryClient();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [datePreset, setDatePreset] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Sale details sheet
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("sale_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    setDateRange(undefined);
    setCalendarOpen(false);
  };

  const getDateFilterRange = (): { from: Date; to: Date } | null => {
    const now = new Date();
    if (datePreset === "this_month") return { from: startOfMonth(now), to: endOfMonth(now) };
    if (datePreset === "this_year") return { from: startOfYear(now), to: endOfYear(now) };
    if (datePreset === "custom" && dateRange?.from) {
      return { from: dateRange.from, to: dateRange.to || dateRange.from };
    }
    return null;
  };

  const isDateFilterActive = datePreset !== "all";

  // Sync from both platforms
  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const startOfYear = `${new Date().getFullYear()}-01-01`;
      const endDate = format(new Date(), "yyyy-MM-dd");
      
      // Get latest sale dates per platform
      const { data: latestSales } = await supabase
        .from("sales")
        .select("platform, sale_date")
        .in("platform", ["hotmart", "asaas"])
        .order("sale_date", { ascending: false });
      
      const latestByPlatform: Record<string, string> = {};
      latestSales?.forEach(sale => {
        if (!latestByPlatform[sale.platform]) {
          latestByPlatform[sale.platform] = sale.sale_date;
        }
      });
      
      let hotmartResult = { created: 0, updated: 0 };
      let asaasResult = { created: 0, updated: 0 };
      
      // Sync Hotmart
      try {
        const hotmartStartDate = latestByPlatform["hotmart"] || startOfYear;
        console.log(`Syncing Hotmart from ${hotmartStartDate} to ${endDate}`);
        
        const { data: hotmartData, error: hotmartError } = await supabase.functions.invoke("hotmart-sync", {
          body: { 
            action: "sync_sales",
            startDate: hotmartStartDate,
            endDate,
          },
        });
        
        if (hotmartError) throw hotmartError;
        if (hotmartData?.success) {
          hotmartResult = { created: hotmartData.created || 0, updated: hotmartData.updated || 0 };
        }
      } catch (err: any) {
        console.error("Hotmart sync error:", err);
      }
      
      // Sync Asaas (only paid)
      try {
        const asaasStartDate = latestByPlatform["asaas"] || startOfYear;
        console.log(`Syncing Asaas from ${asaasStartDate} to ${endDate}`);
        
        const { data: asaasData, error: asaasError } = await supabase.functions.invoke("asaas-sync", {
          body: { 
            action: "sync_payments",
            startDate: asaasStartDate,
            endDate,
            sellerId: null, // Will be assigned later manually
            userId: profile?.id,
            onlyPaid: true,
          },
        });
        
        if (asaasError) throw asaasError;
        if (asaasData?.success) {
          asaasResult = { created: asaasData.created || 0, updated: asaasData.updated || 0 };
        }
      } catch (err: any) {
        console.error("Asaas sync error:", err);
      }
      
      const totalCreated = hotmartResult.created + asaasResult.created;
      const totalUpdated = hotmartResult.updated + asaasResult.updated;
      
      toast.success(
        `Sincronização concluída: ${totalCreated} novas, ${totalUpdated} atualizadas`
      );
      
      refetch();
      refetchLastSync();
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["hotmart-sales-db"] });
      
    } catch (err: any) {
      console.error("Sync error:", err);
      toast.error("Erro ao sincronizar: " + (err.message || "Erro desconhecido"));
    } finally {
      setSyncing(false);
    }
  };

  // Filter and sort sales
  const filteredAndSortedSales = useMemo(() => {
    let result = sales || [];
    
    // Apply platform filter
    if (platformFilter !== "all") {
      result = result.filter(sale => sale.platform === platformFilter);
    }
    
    // Apply status filter
    if (statusFilter === "pending") {
      result = result.filter(sale => !sale.seller_id);
    } else if (statusFilter === "assigned") {
      result = result.filter(sale => sale.seller_id);
    }

    // Apply date filter
    const dateFilterRange = getDateFilterRange();
    if (dateFilterRange) {
      result = result.filter(sale => {
        const saleDate = parseISO(sale.sale_date);
        return isWithinInterval(saleDate, { start: dateFilterRange.from, end: dateFilterRange.to });
      });
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(sale => 
        sale.client_name.toLowerCase().includes(term) ||
        sale.client_email?.toLowerCase().includes(term) ||
        sale.product_name.toLowerCase().includes(term) ||
        sale.external_id.toLowerCase().includes(term) ||
        sale.seller?.full_name?.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    result = [...result].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortField) {
        case "transaction":
          aValue = a.external_id;
          bValue = b.external_id;
          break;
        case "client_name":
          aValue = a.client_name.toLowerCase();
          bValue = b.client_name.toLowerCase();
          break;
        case "product_name":
          aValue = a.product_name.toLowerCase();
          bValue = b.product_name.toLowerCase();
          break;
        case "total_value":
          aValue = a.total_value;
          bValue = b.total_value;
          break;
        case "sale_date":
          aValue = new Date(a.sale_date).getTime();
          bValue = new Date(b.sale_date).getTime();
          break;
        case "seller_name":
          aValue = a.seller?.full_name?.toLowerCase() || "zzz";
          bValue = b.seller?.full_name?.toLowerCase() || "zzz";
          break;
        case "platform":
          aValue = a.platform;
          bValue = b.platform;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [sales, searchTerm, statusFilter, platformFilter, sortField, sortDirection, datePreset, dateRange]);

  // Stats
  const stats = useMemo(() => {
    const allSales = sales || [];
    const totalValue = allSales.reduce((sum, sale) => sum + sale.total_value, 0);
    const pendingCount = allSales.filter(s => !s.seller_id).length;
    const pendingValue = allSales.filter(s => !s.seller_id).reduce((sum, s) => sum + s.total_value, 0);
    const assignedCount = allSales.filter(s => s.seller_id).length;
    const hotmartCount = allSales.filter(s => s.platform === "hotmart").length;
    const asaasCount = allSales.filter(s => s.platform === "asaas").length;
    
    return { total: allSales.length, totalValue, pendingCount, pendingValue, assignedCount, hotmartCount, asaasCount };
  }, [sales]);

  const getPlatformBadge = (platform: string) => {
    if (platform === "hotmart") {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Hotmart</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Asaas</Badge>;
  };

  const handleExportCSV = () => {
    const headers = ["Plataforma", "Transação", "Produto", "Cliente", "E-mail", "Valor", "Parcelas", "Data", "Vendedor", "Origem"];
    const rows = filteredAndSortedSales.map(sale => [
      sale.platform,
      sale.external_id,
      sale.product_name,
      sale.client_name,
      sale.client_email || "",
      sale.total_value.toFixed(2).replace(".", ","),
      sale.installments_count,
      format(new Date(sale.sale_date), "dd/MM/yyyy"),
      sale.seller ? (sale.seller.display_name || sale.seller.full_name) : "Sem vendedor",
      sale.funnel_source || sale.tracking_source_sck || sale.tracking_source || sale.tracking_external_code || "",
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vendas-realizadas-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredAndSortedSales.length} vendas exportadas!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalValue)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Sem Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.pendingValue)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Com Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.assignedCount}</div>
            <p className="text-xs text-muted-foreground">
              Atribuídas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Por Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-sm">
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                {stats.hotmartCount} Hotmart
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                {stats.asaasCount} Asaas
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Última Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {lastSync ? formatDistanceToNow(new Date(lastSync.created_at), { addSuffix: true, locale: ptBR }) : "Nunca"}
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {lastSync?.platform}
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Main Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Vendas Realizadas</CardTitle>
              <CardDescription>
                Vendas sincronizadas de Hotmart e Asaas (apenas pagas)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={filteredAndSortedSales.length === 0}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Exportar CSV
              </Button>
              <Button 
                onClick={handleSyncAll} 
                disabled={syncing}
                className="gap-2"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {syncing ? "Sincronizando..." : "Buscar Novas Vendas"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, produto, transação ou vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Date filter presets */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={datePreset === "all" ? "secondary" : "ghost"}
                className="h-9 text-xs"
                onClick={() => handleDatePreset("all")}
              >
                Todas
              </Button>
              <Button
                size="sm"
                variant={datePreset === "this_month" ? "secondary" : "ghost"}
                className="h-9 text-xs"
                onClick={() => handleDatePreset("this_month")}
              >
                Este mês
              </Button>
              <Button
                size="sm"
                variant={datePreset === "this_year" ? "secondary" : "ghost"}
                className="h-9 text-xs"
                onClick={() => handleDatePreset("this_year")}
              >
                Este ano
              </Button>
              {/* Custom date range picker */}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant={datePreset === "custom" ? "secondary" : "ghost"}
                    className={cn("h-9 text-xs gap-1", datePreset === "custom" && "font-medium")}
                    onClick={() => setDatePreset("custom")}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {datePreset === "custom" && dateRange?.from
                      ? dateRange.to
                        ? `${format(dateRange.from, "dd/MM")} – ${format(dateRange.to, "dd/MM")}`
                        : format(dateRange.from, "dd/MM/yyyy")
                      : "Personalizado"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      if (range?.from) setDatePreset("custom");
                    }}
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                    initialFocus
                  />
                  {dateRange?.from && (
                    <div className="p-2 border-t flex justify-end">
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setDateRange(undefined); setDatePreset("all"); setCalendarOpen(false); }}>
                        <X className="h-3 w-3" /> Limpar
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              {isDateFilterActive && (
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-muted-foreground" onClick={() => handleDatePreset("all")}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="hotmart">Hotmart</SelectItem>
                <SelectItem value="asaas">Asaas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Sem vendedor</SelectItem>
                <SelectItem value="assigned">Com vendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filteredAndSortedSales.length > 0 ? (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("platform")}
                    >
                      Plataforma
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("transaction")}
                    >
                      Transação
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("product_name")}
                    >
                      Produto
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("client_name")}
                    >
                      Cliente
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort("total_value")}
                    >
                      Valor
                    </TableHead>
                    <TableHead className="text-center">Parcelas</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("sale_date")}
                    >
                      Data
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("seller_name")}
                    >
                      Vendedor
                    </TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {getPlatformBadge(sale.platform)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-1">
                          <span className="max-w-[120px] truncate" title={sale.external_id}>
                            {sale.external_id}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(sale.external_id);
                              toast.success("ID copiado!");
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {sale.product_name}
                      </TableCell>
                      <TableCell>
                        <div 
                          className="cursor-pointer hover:text-primary transition-colors"
                          onClick={() => {
                            setSelectedSaleId(sale.id);
                            setDetailsOpen(true);
                          }}
                        >
                          <div className="font-medium truncate max-w-[150px] hover:underline">{sale.client_name}</div>
                          {sale.client_email && (
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {sale.client_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(sale.total_value)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{sale.installments_count}x</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {sale.seller ? (
                          <Badge variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" />
                            {sale.seller.display_name || sale.seller.full_name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-warning border-warning/50">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {sale.funnel_source ? (
                          <span className="text-xs font-medium truncate max-w-[120px] block" title={sale.funnel_source}>
                            {sale.funnel_source}
                          </span>
                        ) : sale.tracking_source || sale.tracking_source_sck || sale.tracking_external_code ? (
                          <div className="text-xs space-y-0.5">
                            {sale.tracking_source_sck && (
                              <span className="font-medium truncate max-w-[120px] block" title={sale.tracking_source_sck}>
                                {sale.tracking_source_sck}
                              </span>
                            )}
                            {!sale.tracking_source_sck && sale.tracking_source && (
                              <span className="font-medium truncate max-w-[120px] block" title={sale.tracking_source}>
                                {sale.tracking_source}
                              </span>
                            )}
                            {!sale.tracking_source_sck && !sale.tracking_source && sale.tracking_external_code && (
                              <span className="font-medium truncate max-w-[120px] block" title={sale.tracking_external_code}>
                                {sale.tracking_external_code}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhuma venda encontrada</p>
              <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={syncing} className="mt-4">
                {syncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Buscar Vendas
              </Button>
            </div>
          )}
          
          {/* Footer info */}
          <div className="text-xs text-muted-foreground text-center">
            Mostrando {filteredAndSortedSales.length} de {sales?.length || 0} vendas
          </div>
        </CardContent>
      </Card>
      
      {/* Sale Details Sheet */}
      <SaleDetailsSheet 
        saleId={selectedSaleId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
