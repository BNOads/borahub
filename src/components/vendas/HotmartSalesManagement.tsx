import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/components/funnel-panel/types";
import { 
  Search, 
  UserPlus, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ShoppingCart, 
  Users, 
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type SortField = "external_id" | "client_name" | "product_name" | "total_value" | "sale_date" | "seller_name";
type SortDirection = "asc" | "desc";

interface HotmartSale {
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

function useHotmartSales() {
  return useQuery({
    queryKey: ["hotmart-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          seller:profiles!sales_seller_id_fkey(full_name, display_name)
        `)
        .eq("platform", "hotmart")
        .order("sale_date", { ascending: false });
      
      if (error) throw error;
      return data as HotmartSale[];
    },
  });
}

function useSellers() {
  return useQuery({
    queryKey: ["sellers-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, display_name")
        .eq("is_active", true)
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });
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
    refetchInterval: 60000, // Refetch every minute
  });
}

export function HotmartSalesManagement() {
  const { data: hotmartSales, isLoading, refetch } = useHotmartSales();
  const { data: sellers } = useSellers();
  const { data: lastSync, refetch: refetchLastSync } = useLastSync();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const [assigningSeller, setAssigningSeller] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [commissionPercent, setCommissionPercent] = useState("10");
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
  
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Manual sync handler
  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("hotmart-sync", {
        body: { action: "scheduled_sync" },
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(`Sincronização concluída: ${data.created} novas, ${data.updated} atualizadas`);
        refetch();
        refetchLastSync();
        queryClient.invalidateQueries({ queryKey: ["pending-sales"] });
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

  const filteredAndSortedSales = useMemo(() => {
    let result = hotmartSales || [];
    
    // Apply status filter
    if (filterStatus === "pending") {
      result = result.filter(sale => !sale.seller_id);
    } else if (filterStatus === "assigned") {
      result = result.filter(sale => sale.seller_id);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(sale => 
        sale.client_name.toLowerCase().includes(term) ||
        sale.external_id.toLowerCase().includes(term) ||
        sale.product_name.toLowerCase().includes(term) ||
        sale.client_email?.toLowerCase().includes(term) ||
        sale.seller?.full_name?.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    result = [...result].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortField) {
        case "external_id":
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
  }, [hotmartSales, searchTerm, filterStatus, sortField, sortDirection]);

  // Selection handlers
  const toggleSelectSale = (saleId: string) => {
    const newSelected = new Set(selectedSaleIds);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSaleIds(newSelected);
  };

  const toggleSelectAll = () => {
    const unassignedSales = filteredAndSortedSales.filter(s => !s.seller_id);
    if (selectedSaleIds.size === unassignedSales.length && unassignedSales.length > 0) {
      setSelectedSaleIds(new Set());
    } else {
      setSelectedSaleIds(new Set(unassignedSales.map(s => s.id)));
    }
  };

  const clearSelection = () => {
    setSelectedSaleIds(new Set());
    setSelectedSellerId("");
  };

  // Assign seller to selected sales
  const handleAssignSeller = async () => {
    if (selectedSaleIds.size === 0) {
      toast.error("Selecione pelo menos uma venda");
      return;
    }
    
    if (!selectedSellerId) {
      toast.error("Selecione um vendedor");
      return;
    }
    
    setAssigningSeller(true);
    const saleIds = Array.from(selectedSaleIds);
    
    try {
      const commission = parseFloat(commissionPercent) || 10;
      
      // Update sales with seller
      const { error: salesError } = await supabase
        .from("sales")
        .update({ 
          seller_id: selectedSellerId,
          commission_percent: commission
        })
        .in("id", saleIds);
      
      if (salesError) throw salesError;
      
      // Get installments for these sales
      const { data: installments } = await supabase
        .from("installments")
        .select("id, sale_id, value, due_date, status")
        .in("sale_id", saleIds);
      
      if (installments && installments.length > 0) {
        // Create or update commissions for each installment
        for (const inst of installments) {
          const commissionValue = (inst.value * commission) / 100;
          const competenceMonth = inst.due_date.substring(0, 7) + "-01";
          
          // Check if commission exists
          const { data: existingCommission } = await supabase
            .from("commissions")
            .select("id")
            .eq("installment_id", inst.id)
            .maybeSingle();
          
          if (existingCommission) {
            await supabase
              .from("commissions")
              .update({
                seller_id: selectedSellerId,
                commission_percent: commission,
                commission_value: commissionValue,
              })
              .eq("id", existingCommission.id);
          } else {
            await supabase
              .from("commissions")
              .insert({
                installment_id: inst.id,
                seller_id: selectedSellerId,
                installment_value: inst.value,
                commission_percent: commission,
                commission_value: commissionValue,
                competence_month: competenceMonth,
                status: inst.status === "paid" ? "released" : "pending",
              });
          }
        }
      }
      
      toast.success(`${saleIds.length} venda(s) atribuída(s) ao vendedor`);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["hotmart-sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      
      clearSelection();
    } catch (err: any) {
      console.error("Error assigning seller:", err);
      toast.error("Erro ao atribuir vendedor: " + (err.message || "Erro desconhecido"));
    } finally {
      setAssigningSeller(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const sales = hotmartSales || [];
    const totalValue = sales.reduce((sum, sale) => sum + sale.total_value, 0);
    const pendingCount = sales.filter(s => !s.seller_id).length;
    const pendingValue = sales.filter(s => !s.seller_id).reduce((sum, s) => sum + s.total_value, 0);
    const assignedCount = sales.filter(s => s.seller_id).length;
    
    return { total: sales.length, totalValue, pendingCount, pendingValue, assignedCount };
  }, [hotmartSales]);

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
              Total Hotmart
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
              Automática a cada 15 min
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Vendas Realizadas na Hotmart</CardTitle>
              <CardDescription>
                Todas as vendas sincronizadas da plataforma Hotmart
              </CardDescription>
            </div>
            <Button 
              onClick={handleManualSync} 
              disabled={syncing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? "Sincronizando..." : "Sincronizar Agora"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, ID, produto ou vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as vendas</SelectItem>
                <SelectItem value="pending">Sem vendedor</SelectItem>
                <SelectItem value="assigned">Com vendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Assignment Bar */}
          {selectedSaleIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
              <Badge variant="secondary" className="text-sm">
                {selectedSaleIds.size} selecionada(s)
              </Badge>
              
              <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {sellers?.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Comissão:</span>
                <Input
                  type="number"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  className="w-20"
                  min="0"
                  max="100"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              
              <Button 
                onClick={handleAssignSeller}
                disabled={!selectedSellerId || assigningSeller}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {assigningSeller ? "Atribuindo..." : "Atribuir Vendedor"}
              </Button>
              
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Limpar
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedSaleIds.size === filteredAndSortedSales.filter(s => !s.seller_id).length && 
                        filteredAndSortedSales.filter(s => !s.seller_id).length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("external_id")}
                  >
                    <div className="flex items-center">
                      ID <SortIcon field="external_id" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("client_name")}
                  >
                    <div className="flex items-center">
                      Cliente <SortIcon field="client_name" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("product_name")}
                  >
                    <div className="flex items-center">
                      Produto <SortIcon field="product_name" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort("total_value")}
                  >
                    <div className="flex items-center justify-end">
                      Valor <SortIcon field="total_value" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Parcelas</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("sale_date")}
                  >
                    <div className="flex items-center">
                      Data <SortIcon field="sale_date" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("seller_name")}
                  >
                    <div className="flex items-center">
                      Vendedor <SortIcon field="seller_name" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingCart className="h-8 w-8 opacity-50" />
                        <span>Nenhuma venda encontrada</span>
                        <Button variant="outline" size="sm" onClick={handleManualSync} disabled={syncing}>
                          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                          Sincronizar com Hotmart
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedSales.map((sale) => (
                    <TableRow 
                      key={sale.id}
                      className={selectedSaleIds.has(sale.id) ? "bg-accent/10" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedSaleIds.has(sale.id)}
                          onCheckedChange={() => toggleSelectSale(sale.id)}
                          disabled={!!sale.seller_id}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {sale.external_id.substring(0, 12)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-[150px]">{sale.client_name}</p>
                          {sale.client_email && (
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {sale.client_email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="truncate max-w-[150px]">{sale.product_name}</p>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Footer info */}
          <div className="text-xs text-muted-foreground text-center">
            A sincronização automática ocorre a cada 15 minutos
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
