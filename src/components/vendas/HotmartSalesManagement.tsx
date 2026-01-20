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
  Loader2
} from "lucide-react";
import { format, subDays, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type SortField = "transaction" | "client_name" | "product_name" | "total_value" | "sale_date";
type SortDirection = "asc" | "desc";

interface HotmartSale {
  product: { id: number; name: string };
  buyer: { name: string; email: string };
  purchase: {
    transaction: string;
    approved_date?: number;
    status: string;
    price: { value: number };
    payment: { installments_number: number };
  };
}

function useLastSync() {
  return useQuery({
    queryKey: ["last-hotmart-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotmart_sync_logs")
        .select("created_at, status, total_records, created_records, updated_records")
        .eq("sync_type", "scheduled_sync")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });
}

export function HotmartSalesManagement() {
  const { data: lastSync, refetch: refetchLastSync } = useLastSync();
  const queryClient = useQueryClient();
  
  // Filters
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Data from API
  const [sales, setSales] = useState<HotmartSale[]>([]);
  const [loading, setLoading] = useState(false);
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

  // Fetch sales from Hotmart API
  const handleFetchSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("hotmart-sync", {
        body: { 
          action: "get_sales",
          startDate,
          endDate,
          status: statusFilter || undefined,
        },
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      setSales(data.sales || []);
      toast.success(`${data.sales?.length || 0} vendas carregadas da Hotmart`);
    } catch (err: any) {
      console.error("Fetch sales error:", err);
      toast.error("Erro ao buscar vendas: " + (err.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  // Manual sync handler - saves to database
  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("hotmart-sync", {
        body: { action: "scheduled_sync" },
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(`Sincronização concluída: ${data.created} novas, ${data.updated} atualizadas`);
        refetchLastSync();
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        queryClient.invalidateQueries({ queryKey: ["hotmart-sales"] });
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
    let result = sales;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(sale => 
        sale.buyer.name.toLowerCase().includes(term) ||
        sale.buyer.email.toLowerCase().includes(term) ||
        sale.product.name.toLowerCase().includes(term) ||
        sale.purchase.transaction.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    result = [...result].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortField) {
        case "transaction":
          aValue = a.purchase.transaction;
          bValue = b.purchase.transaction;
          break;
        case "client_name":
          aValue = a.buyer.name.toLowerCase();
          bValue = b.buyer.name.toLowerCase();
          break;
        case "product_name":
          aValue = a.product.name.toLowerCase();
          bValue = b.product.name.toLowerCase();
          break;
        case "total_value":
          aValue = a.purchase.price.value;
          bValue = b.purchase.price.value;
          break;
        case "sale_date":
          aValue = a.purchase.approved_date || 0;
          bValue = b.purchase.approved_date || 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [sales, searchTerm, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => {
    const totalValue = sales.reduce((sum, sale) => sum + sale.purchase.price.value, 0);
    const approvedCount = sales.filter(s => s.purchase.status === "APPROVED" || s.purchase.status === "COMPLETED").length;
    const canceledCount = sales.filter(s => s.purchase.status === "CANCELED" || s.purchase.status === "REFUNDED").length;
    
    return { total: sales.length, totalValue, approvedCount, canceledCount };
  }, [sales]);

  function formatStatus(status: string) {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      "APPROVED": { label: "Aprovado", variant: "default" },
      "COMPLETED": { label: "Completo", variant: "default" },
      "CANCELED": { label: "Cancelado", variant: "destructive" },
      "REFUNDED": { label: "Reembolsado", variant: "destructive" },
      "CHARGEBACK": { label: "Chargeback", variant: "destructive" },
      "WAITING_PAYMENT": { label: "Aguardando", variant: "secondary" },
      "PENDING": { label: "Pendente", variant: "secondary" },
      "EXPIRED": { label: "Expirado", variant: "outline" },
    };
    
    const mapped = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Total Carregado
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
            <CardTitle className="text-sm font-medium text-primary">Aprovadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.approvedCount}</div>
            <p className="text-xs text-muted-foreground">Vendas aprovadas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Canceladas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.canceledCount}</div>
            <p className="text-xs text-muted-foreground">Canceladas/Reembolsadas</p>
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
              Automática a cada 15 min
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
                Busque vendas diretamente da API Hotmart
              </CardDescription>
            </div>
            <Button 
              onClick={handleManualSync} 
              disabled={syncing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? "Salvando..." : "Salvar no Banco"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={statusFilter || "__all__"} 
                onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="APPROVED">Aprovado</SelectItem>
                  <SelectItem value="COMPLETED">Completo</SelectItem>
                  <SelectItem value="CANCELED">Cancelado</SelectItem>
                  <SelectItem value="REFUNDED">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleFetchSales} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Buscar Vendas
            </Button>
          </div>

          {/* Search */}
          {sales.length > 0 && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, produto ou transação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {/* Table */}
          {sales.length > 0 ? (
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
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedSales.map((sale) => (
                    <TableRow key={sale.purchase.transaction}>
                      <TableCell className="font-mono text-xs">
                        {sale.purchase.transaction.substring(0, 12)}...
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {sale.product.name}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium truncate max-w-[150px]">{sale.buyer.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {sale.buyer.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(sale.purchase.price.value)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{sale.purchase.payment.installments_number || 1}x</Badge>
                      </TableCell>
                      <TableCell>
                        {sale.purchase.approved_date
                          ? format(new Date(sale.purchase.approved_date), "dd/MM/yyyy", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell>{formatStatus(sale.purchase.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Defina os filtros e clique em "Buscar Vendas" para visualizar</p>
              <p className="text-xs mt-2">As vendas serão buscadas diretamente da API Hotmart</p>
            </div>
          )}
          
          {/* Footer info */}
          <div className="text-xs text-muted-foreground text-center">
            Clique em "Salvar no Banco" para sincronizar as vendas com o sistema
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
