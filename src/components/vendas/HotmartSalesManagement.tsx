import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  RefreshCw,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Download
} from "lucide-react";
import { format, subDays, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type SortField = "transaction" | "client_name" | "product_name" | "total_value" | "sale_date" | "seller_name";
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
  seller_id: string | null;
  seller?: {
    full_name: string;
    display_name: string | null;
  } | null;
}

function useHotmartSales() {
  return useQuery({
    queryKey: ["hotmart-sales-db"],
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
          seller_id,
          seller:profiles!sales_seller_id_fkey(full_name, display_name)
        `)
        .eq("platform", "hotmart")
        .order("sale_date", { ascending: false });
      
      if (error) throw error;
      return data as DbSale[];
    },
  });
}

function useLastSync() {
  return useQuery({
    queryKey: ["last-hotmart-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("csv_imports")
        .select("created_at, records_created, records_updated, records_processed")
        .eq("platform", "hotmart")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });
}

function useLatestSaleDate() {
  return useQuery({
    queryKey: ["latest-hotmart-sale-date"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("sale_date")
        .eq("platform", "hotmart")
        .order("sale_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data?.sale_date || null;
    },
  });
}

export function HotmartSalesManagement() {
  const { data: sales, isLoading, refetch } = useHotmartSales();
  const { data: lastSync, refetch: refetchLastSync } = useLastSync();
  const { data: latestSaleDate } = useLatestSaleDate();
  const queryClient = useQueryClient();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [syncing, setSyncing] = useState(false);
  
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

  // Sync handler - fetches from Hotmart starting from latest sale date and saves to DB
  const handleSync = async () => {
    setSyncing(true);
    try {
      // If we have sales, start from the latest sale date, otherwise fetch last 60 days
      const startDate = latestSaleDate 
        ? latestSaleDate 
        : format(subDays(new Date(), 60), "yyyy-MM-dd");
      const endDate = format(new Date(), "yyyy-MM-dd");
      
      console.log(`Syncing from ${startDate} to ${endDate}`);
      
      const { data, error } = await supabase.functions.invoke("hotmart-sync", {
        body: { 
          action: "sync_sales",
          startDate,
          endDate,
        },
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(`Sincronização concluída: ${data.created} novas, ${data.updated} atualizadas`);
        refetch();
        refetchLastSync();
        queryClient.invalidateQueries({ queryKey: ["latest-hotmart-sale-date"] });
        queryClient.invalidateQueries({ queryKey: ["sales"] });
      } else {
        throw new Error(data.error || "Erro na sincronização");
      }
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
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [sales, searchTerm, statusFilter, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => {
    const allSales = sales || [];
    const totalValue = allSales.reduce((sum, sale) => sum + sale.total_value, 0);
    const pendingCount = allSales.filter(s => !s.seller_id).length;
    const pendingValue = allSales.filter(s => !s.seller_id).reduce((sum, s) => sum + s.total_value, 0);
    const assignedCount = allSales.filter(s => s.seller_id).length;
    
    return { total: allSales.length, totalValue, pendingCount, pendingValue, assignedCount };
  }, [sales]);

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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Total no Banco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalValue)} em vendas
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
              {formatCurrency(stats.pendingValue)} pendente
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
              Atribuídas a vendedores
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Última Sincronização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {lastSync ? formatDistanceToNow(new Date(lastSync.created_at), { addSuffix: true, locale: ptBR }) : "Nunca"}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastSync && `${lastSync.records_created || 0} novas, ${lastSync.records_updated || 0} atualizadas`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Vendas Realizadas na Hotmart</CardTitle>
              <CardDescription>
                Vendas sincronizadas da Hotmart • Busca automática a partir da última venda
              </CardDescription>
            </div>
            <Button 
              onClick={handleSync} 
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as vendas</SelectItem>
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
                      <TableCell className="font-mono text-xs">
                        {sale.external_id.substring(0, 12)}...
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {sale.product_name}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium truncate max-w-[150px]">{sale.client_name}</div>
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
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="mt-4">
                {syncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Buscar Vendas da Hotmart
              </Button>
            </div>
          )}
          
          {/* Footer info */}
          <div className="text-xs text-muted-foreground text-center">
            A busca inicia a partir de {latestSaleDate ? format(new Date(latestSaleDate), "dd/MM/yyyy", { locale: ptBR }) : "60 dias atrás"} para evitar duplicatas
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
