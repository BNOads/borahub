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
import { Search, UserPlus, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, CheckCircle2, Users, RefreshCw, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type SortField = "external_id" | "client_name" | "product_name" | "total_value" | "sale_date";
type SortDirection = "asc" | "desc";

interface PendingSale {
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
}

function usePendingSales() {
  return useQuery({
    queryKey: ["pending-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .is("seller_id", null)
        .eq("platform", "hotmart")
        .order("sale_date", { ascending: false });
      
      if (error) throw error;
      return data as PendingSale[];
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

export function PendingSalesManagement() {
  const { data: pendingSales, isLoading, refetch } = usePendingSales();
  const { data: sellers } = useSellers();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const [assigningSeller, setAssigningSeller] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [commissionPercent, setCommissionPercent] = useState("10");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // Auto-sync every 15 minutes
  useEffect(() => {
    // Initial sync on mount
    handleSync(true);
    
    // Set up interval for auto-sync every 15 minutes
    const intervalId = setInterval(() => {
      handleSync(true);
    }, 15 * 60 * 1000); // 15 minutes in milliseconds
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Manual sync handler
  const handleSync = async (silent = false) => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("hotmart-sync", {
        body: { action: "sync_sales" },
      });
      
      if (error) throw error;
      
      setLastSync(new Date());
      
      // Refresh the pending sales list
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      
      if (!silent) {
        toast.success(`Sincronização concluída: ${data.created || 0} novas, ${data.updated || 0} atualizadas`);
      }
    } catch (err: any) {
      console.error("Sync error:", err);
      if (!silent) {
        toast.error("Erro na sincronização: " + (err.message || "Erro desconhecido"));
      }
    } finally {
      setSyncing(false);
    }
  };
  
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

  const filteredAndSortedSales = useMemo(() => {
    let result = pendingSales || [];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(sale => 
        sale.client_name.toLowerCase().includes(term) ||
        sale.external_id.toLowerCase().includes(term) ||
        sale.product_name.toLowerCase().includes(term) ||
        sale.client_email?.toLowerCase().includes(term)
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
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [pendingSales, searchTerm, sortField, sortDirection]);

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
    if (selectedSaleIds.size === filteredAndSortedSales.length) {
      setSelectedSaleIds(new Set());
    } else {
      setSelectedSaleIds(new Set(filteredAndSortedSales.map(s => s.id)));
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
      queryClient.invalidateQueries({ queryKey: ["pending-sales"] });
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

  // Stats by seller (for sales that have seller assigned - from main sales)
  const salesBySeller = useMemo(() => {
    // This would need to query sales WITH sellers to show distribution
    // For now, we'll just show the pending count
    return sellers?.map(seller => ({
      ...seller,
      salesCount: 0, // Would need to query
    })) || [];
  }, [sellers]);

  const totalPendingValue = useMemo(() => {
    return (pendingSales || []).reduce((sum, sale) => sum + sale.total_value, 0);
  }, [pendingSales]);

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Vendas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSales?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando atribuição de vendedor
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(totalPendingValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Em vendas sem vendedor
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Vendedores Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sellers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Disponíveis para atribuição
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Vendas Hotmart Sem Vendedor</CardTitle>
              <CardDescription>
                Selecione vendas e atribua um vendedor para que elas apareçam na aba "Realizadas"
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {lastSync && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Última sync: {formatDistanceToNow(lastSync, { addSuffix: true, locale: ptBR })}</span>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSync(false)}
                disabled={syncing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando..." : "Sincronizar Hotmart"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, ID ou produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
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
                      checked={selectedSaleIds.size === filteredAndSortedSales.length && filteredAndSortedSales.length > 0}
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                        <span>Nenhuma venda pendente de atribuição!</span>
                        <span className="text-xs">Todas as vendas do Hotmart já têm vendedor atribuído.</span>
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
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {sale.external_id.substring(0, 12)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sale.client_name}</div>
                          {sale.client_email && (
                            <div className="text-xs text-muted-foreground">{sale.client_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{sale.product_name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(sale.total_value)}
                      </TableCell>
                      <TableCell className="text-center">
                        {sale.installments_count}x
                      </TableCell>
                      <TableCell>
                        {format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sale.status === "active" ? "default" : "secondary"}>
                          {sale.status === "active" ? "Ativa" : sale.status}
                        </Badge>
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
