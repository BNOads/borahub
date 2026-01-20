import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Download
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { SaleDetailsSheet } from "./SaleDetailsSheet";

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
  }, [sales, searchTerm, statusFilter, platformFilter, sortField, sortDirection]);

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
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, produto, transação ou vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {getPlatformBadge(sale.platform)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {sale.external_id.substring(0, 12)}...
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
