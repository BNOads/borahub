import { useState, useMemo, useRef } from "react";
import { useSales, Sale, useCreateCsvImport, useProducts } from "@/hooks/useSales";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/components/funnel-panel/types";
import { Plus, Search, Eye, Pencil, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Filter, Upload, FileText, ShoppingCart, X, Trash2, UserCheck, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { CreateSaleModal } from "./CreateSaleModal";
import { EditSaleModal } from "./EditSaleModal";
import { SaleDetailsSheet } from "./SaleDetailsSheet";
import { toast } from "sonner";

type SortField = "external_id" | "client_name" | "product_name" | "seller" | "total_value" | "installments_count" | "sale_date" | "status";
type SortDirection = "asc" | "desc";

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

export function SalesManagement() {
  const { data: sales, isLoading } = useSales();
  const { data: products } = useProducts();
  const { data: sellers } = useSellers();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  
  // Bulk selection state
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkSellerId, setBulkSellerId] = useState<string>("");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("sale_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // CSV Import state
  const salesFileInputRef = useRef<HTMLInputElement>(null);
  const [salesCsvData, setSalesCsvData] = useState<string[][]>([]);
  const [salesHeaders, setSalesHeaders] = useState<string[]>([]);
  const [salesMapping, setSalesMapping] = useState<Record<string, string>>({});
  const [selectedSeller, setSelectedSeller] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [defaultCommission, setDefaultCommission] = useState("10");
  const [salesProcessing, setSalesProcessing] = useState(false);

  // Bulk selection handlers
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
    setBulkAction("");
    setBulkSellerId("");
  };

  const handleBulkAction = async () => {
    if (selectedSaleIds.size === 0) {
      toast.error("Selecione pelo menos uma venda");
      return;
    }

    setBulkProcessing(true);
    const saleIds = Array.from(selectedSaleIds);

    try {
      switch (bulkAction) {
        case "activate": {
          const { error } = await supabase
            .from("sales")
            .update({ status: "active" })
            .in("id", saleIds);
          if (error) throw error;
          toast.success(`${saleIds.length} venda(s) ativada(s)`);
          break;
        }
        case "cancel": {
          const { error } = await supabase
            .from("sales")
            .update({ status: "cancelled" })
            .in("id", saleIds);
          if (error) throw error;
          
          // Cancel related installments and commissions
          const { data: installments } = await supabase
            .from("installments")
            .select("id")
            .in("sale_id", saleIds);
          
          if (installments && installments.length > 0) {
            const installmentIds = installments.map(i => i.id);
            await supabase
              .from("installments")
              .update({ status: "cancelled" })
              .in("id", installmentIds);
            await supabase
              .from("commissions")
              .update({ status: "cancelled" })
              .in("installment_id", installmentIds);
          }
          
          toast.success(`${saleIds.length} venda(s) cancelada(s)`);
          break;
        }
        case "change_seller": {
          if (!bulkSellerId) {
            toast.error("Selecione um vendedor");
            return;
          }
          
          const { error } = await supabase
            .from("sales")
            .update({ seller_id: bulkSellerId })
            .in("id", saleIds);
          if (error) throw error;
          
          // Update commissions seller
          const { data: installments } = await supabase
            .from("installments")
            .select("id")
            .in("sale_id", saleIds);
          
          if (installments && installments.length > 0) {
            await supabase
              .from("commissions")
              .update({ seller_id: bulkSellerId })
              .in("installment_id", installments.map(i => i.id));
          }
          
          toast.success(`Vendedor alterado em ${saleIds.length} venda(s)`);
          break;
        }
        case "delete": {
          // Delete commissions first
          const { data: installments } = await supabase
            .from("installments")
            .select("id")
            .in("sale_id", saleIds);
          
          if (installments && installments.length > 0) {
            await supabase
              .from("commissions")
              .delete()
              .in("installment_id", installments.map(i => i.id));
          }
          
          // Delete installments
          await supabase
            .from("installments")
            .delete()
            .in("sale_id", saleIds);
          
          // Delete sales
          const { error } = await supabase
            .from("sales")
            .delete()
            .in("id", saleIds);
          if (error) throw error;
          
          toast.success(`${saleIds.length} venda(s) excluída(s)`);
          break;
        }
        default:
          toast.error("Selecione uma ação");
          return;
      }

      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      clearSelection();
    } catch (err: any) {
      console.error("Bulk action error:", err);
      toast.error("Erro ao processar ação: " + (err.message || "Erro desconhecido"));
    } finally {
      setBulkProcessing(false);
    }
  };
  
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
    let result = sales || [];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(sale => 
        sale.client_name.toLowerCase().includes(term) ||
        sale.external_id.toLowerCase().includes(term) ||
        sale.product_name.toLowerCase().includes(term) ||
        sale.seller?.full_name?.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(sale => sale.status === statusFilter);
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
        case "seller":
          aValue = a.seller?.full_name?.toLowerCase() || "";
          bValue = b.seller?.full_name?.toLowerCase() || "";
          break;
        case "total_value":
          aValue = a.total_value;
          bValue = b.total_value;
          break;
        case "installments_count":
          aValue = a.installments_count;
          bValue = b.installments_count;
          break;
        case "sale_date":
          aValue = new Date(a.sale_date).getTime();
          bValue = new Date(b.sale_date).getTime();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
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

  // CSV Import functions
  function parseCSV(text: string): string[][] {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  }

  function handleSalesFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      
      if (parsed.length > 0) {
        setSalesHeaders(parsed[0]);
        setSalesCsvData(parsed.slice(1));
        autoMapSalesColumns(parsed[0]);
      }
    };
    reader.readAsText(file);
  }

  function autoMapSalesColumns(headers: string[]) {
    const autoMapping: Record<string, string> = {};
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      if ((lowerHeader.includes('id') || lowerHeader.includes('transação') || lowerHeader.includes('transaction')) && !autoMapping.external_id) {
        autoMapping.external_id = String(index);
      }
      if (lowerHeader.includes('cliente') || lowerHeader.includes('comprador') || lowerHeader.includes('buyer') || lowerHeader.includes('customer') || lowerHeader.includes('name')) {
        if (!autoMapping.client_name) autoMapping.client_name = String(index);
      }
      if (lowerHeader.includes('email')) {
        autoMapping.client_email = String(index);
      }
      if (lowerHeader.includes('produto') || lowerHeader.includes('product')) {
        autoMapping.product_name = String(index);
      }
      if (lowerHeader.includes('valor') || lowerHeader.includes('value') || lowerHeader.includes('total') || lowerHeader.includes('price')) {
        if (!autoMapping.total_value) autoMapping.total_value = String(index);
      }
      if (lowerHeader.includes('parcelas') || lowerHeader.includes('installments')) {
        autoMapping.installments_count = String(index);
      }
      if (lowerHeader.includes('data') || lowerHeader.includes('date')) {
        if (!autoMapping.sale_date) autoMapping.sale_date = String(index);
      }
    });
    setSalesMapping(autoMapping);
  }

  async function handleImportSales() {
    if (!salesMapping.external_id || !salesMapping.client_name || !salesMapping.total_value) {
      toast.error("Por favor, mapeie os campos obrigatórios: ID, Cliente e Valor");
      return;
    }

    if (!selectedSeller) {
      toast.error("Selecione um vendedor");
      return;
    }
    
    setSalesProcessing(true);
    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];
    
    try {
      for (const row of salesCsvData) {
        try {
          const externalId = row[parseInt(salesMapping.external_id)] || '';
          if (!externalId) continue;

          const clientName = row[parseInt(salesMapping.client_name)] || 'Cliente';
          const clientEmail = salesMapping.client_email ? row[parseInt(salesMapping.client_email)] : undefined;
          const productName = salesMapping.product_name ? row[parseInt(salesMapping.product_name)] : (selectedProduct ? products?.find(p => p.id === selectedProduct)?.name : 'Produto');
          const totalValue = parseFloat(row[parseInt(salesMapping.total_value)]?.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
          const installmentsCount = salesMapping.installments_count ? parseInt(row[parseInt(salesMapping.installments_count)]) || 1 : 1;
          
          let saleDate = new Date().toISOString().split('T')[0];
          if (salesMapping.sale_date) {
            const dateStr = row[parseInt(salesMapping.sale_date)];
            if (dateStr) {
              const parsed = new Date(dateStr);
              if (!isNaN(parsed.getTime())) {
                saleDate = parsed.toISOString().split('T')[0];
              } else {
                const parts = dateStr.split(/[\/\-]/);
                if (parts.length === 3) {
                  const [d, m, y] = parts;
                  const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
                  if (!isNaN(date.getTime())) {
                    saleDate = date.toISOString().split('T')[0];
                  }
                }
              }
            }
          }

          const { data: existingSale } = await supabase
            .from('sales')
            .select('id')
            .eq('external_id', externalId)
            .maybeSingle();

          if (existingSale) {
            await supabase
              .from('sales')
              .update({
                client_name: clientName,
                client_email: clientEmail || null,
                product_name: productName || 'Produto',
                total_value: totalValue,
                installments_count: installmentsCount,
              })
              .eq('id', existingSale.id);
            updated++;
          } else {
            const { data: newSale, error: saleError } = await supabase
              .from('sales')
              .insert({
                external_id: externalId,
                client_name: clientName,
                client_email: clientEmail || null,
                product_name: productName || 'Produto',
                product_id: selectedProduct || null,
                total_value: totalValue,
                installments_count: installmentsCount,
                platform: 'asaas',
                seller_id: selectedSeller,
                commission_percent: parseFloat(defaultCommission) || 10,
                sale_date: saleDate,
                status: 'active',
              })
              .select('id')
              .single();

            if (saleError) throw saleError;

            const installmentValue = totalValue / installmentsCount;
            const installments = [];
            for (let i = 1; i <= installmentsCount; i++) {
              const dueDate = new Date(saleDate);
              dueDate.setMonth(dueDate.getMonth() + i - 1);
              installments.push({
                sale_id: newSale.id,
                installment_number: i,
                total_installments: installmentsCount,
                value: installmentValue,
                due_date: dueDate.toISOString().split('T')[0],
                status: 'pending',
              });
            }

            await supabase.from('installments').insert(installments);

            const { data: createdInstallments } = await supabase
              .from('installments')
              .select('id, value, due_date')
              .eq('sale_id', newSale.id);

            if (createdInstallments) {
              const commissions = createdInstallments.map(inst => {
                const dueDate = new Date(inst.due_date);
                const competenceMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
                return {
                  installment_id: inst.id,
                  seller_id: selectedSeller,
                  installment_value: inst.value,
                  commission_percent: parseFloat(defaultCommission) || 10,
                  commission_value: (inst.value * (parseFloat(defaultCommission) || 10)) / 100,
                  competence_month: competenceMonth.toISOString().split('T')[0],
                  status: 'pending',
                };
              });
              await supabase.from('commissions').insert(commissions);
            }

            created++;
          }
        } catch (err: any) {
          failed++;
          errors.push(err.message || 'Erro desconhecido');
        }
      }

      await supabase.from('csv_imports').insert({
        platform: 'asaas',
        filename: salesFileInputRef.current?.files?.[0]?.name || 'sales-import.csv',
        records_processed: salesCsvData.length,
        records_created: created,
        records_updated: updated,
        records_failed: failed,
        error_log: errors.length > 0 ? errors.slice(0, 20) : null,
        imported_by: (await supabase.auth.getUser()).data.user?.id,
      });

      toast.success(`Importação concluída: ${created} criados, ${updated} atualizados, ${failed} falhas`);

      setSalesCsvData([]);
      setSalesHeaders([]);
      setSalesMapping({});
      if (salesFileInputRef.current) {
        salesFileInputRef.current.value = '';
      }
    } finally {
      setSalesProcessing(false);
    }
  }
  
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Vendas Cadastradas
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar CSV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, ID, produto ou vendedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Venda
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filtros:</span>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              
              {statusFilter !== "all" && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedSaleIds.size > 0 && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-medium">
                      {selectedSaleIds.size} selecionada{selectedSaleIds.size !== 1 ? 's' : ''}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  </div>
                  
                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    <Select value={bulkAction} onValueChange={setBulkAction}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Ação em massa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activate">
                          <span className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Ativar vendas
                          </span>
                        </SelectItem>
                        <SelectItem value="cancel">
                          <span className="flex items-center gap-2">
                            <X className="h-4 w-4 text-destructive" />
                            Cancelar vendas
                          </span>
                        </SelectItem>
                        <SelectItem value="change_seller">
                          <span className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            Alterar vendedor
                          </span>
                        </SelectItem>
                        <SelectItem value="delete">
                          <span className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-4 w-4" />
                            Excluir vendas
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {bulkAction === "change_seller" && (
                      <Select value={bulkSellerId} onValueChange={setBulkSellerId}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Selecione o vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {sellers?.map((seller) => (
                            <SelectItem key={seller.id} value={seller.id}>
                              {seller.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Button 
                      onClick={handleBulkAction} 
                      disabled={!bulkAction || bulkProcessing}
                      variant={bulkAction === "delete" ? "destructive" : "default"}
                    >
                      {bulkProcessing ? "Processando..." : "Aplicar"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Vendas Cadastradas</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {filteredAndSortedSales.length} venda{filteredAndSortedSales.length !== 1 ? 's' : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={filteredAndSortedSales.length > 0 && selectedSaleIds.size === filteredAndSortedSales.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Selecionar todas"
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("external_id")}
                      >
                        <div className="flex items-center">
                          ID Transação
                          <SortIcon field="external_id" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("client_name")}
                      >
                        <div className="flex items-center">
                          Cliente
                          <SortIcon field="client_name" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("product_name")}
                      >
                        <div className="flex items-center">
                          Produto
                          <SortIcon field="product_name" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("seller")}
                      >
                        <div className="flex items-center">
                          Vendedor
                          <SortIcon field="seller" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("total_value")}
                      >
                        <div className="flex items-center">
                          Valor
                          <SortIcon field="total_value" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("installments_count")}
                      >
                        <div className="flex items-center">
                          Parcelas
                          <SortIcon field="installments_count" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("sale_date")}
                      >
                        <div className="flex items-center">
                          Data
                          <SortIcon field="sale_date" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center">
                          Status
                          <SortIcon field="status" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredAndSortedSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          Nenhuma venda encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedSales.map((sale) => (
                        <TableRow key={sale.id} className={selectedSaleIds.has(sale.id) ? "bg-muted/50" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedSaleIds.has(sale.id)}
                              onCheckedChange={() => toggleSelectSale(sale.id)}
                              aria-label={`Selecionar venda ${sale.external_id}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {sale.external_id}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{sale.client_name}</p>
                              {sale.client_email && (
                                <p className="text-xs text-muted-foreground">{sale.client_email}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{sale.product_name}</TableCell>
                          <TableCell>{sale.seller?.full_name || '-'}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(sale.total_value)}
                          </TableCell>
                          <TableCell>{sale.installments_count}x</TableCell>
                          <TableCell>
                            {format(new Date(sale.sale_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={sale.status === 'active' ? 'default' : 'destructive'}
                            >
                              {sale.status === 'active' ? 'Ativa' : 'Cancelada'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingSale(sale)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedSaleId(sale.id)}
                                title="Ver detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(sale as any).proof_link && (
                                <a
                                  href={(sale as any).proof_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Ver comprovante"
                                >
                                  <Button variant="ghost" size="icon">
                                    <ExternalLink className="h-4 w-4 text-primary" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importar Vendas via CSV
              </CardTitle>
              <CardDescription>
                Importe novas vendas de um arquivo CSV. As parcelas e comissões serão criadas automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Vendedor *</Label>
                  <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.display_name || s.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Produto Padrão</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Do CSV ou selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Usar nome do CSV</SelectItem>
                      {products?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Comissão Padrão (%)</Label>
                  <Input
                    type="number"
                    value={defaultCommission}
                    onChange={(e) => setDefaultCommission(e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleSalesFileUpload}
                  ref={salesFileInputRef}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Arraste um arquivo CSV ou
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => salesFileInputRef.current?.click()}
                  >
                    Selecionar Arquivo
                  </Button>
                </div>
              </div>

              {salesHeaders.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Mapeamento de Colunas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>ID da Transação *</Label>
                      <Select
                        value={salesMapping.external_id || ""}
                        onValueChange={(v) => setSalesMapping({ ...salesMapping, external_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {salesHeaders.map((h, i) => (
                            <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nome do Cliente *</Label>
                      <Select
                        value={salesMapping.client_name || ""}
                        onValueChange={(v) => setSalesMapping({ ...salesMapping, client_name: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {salesHeaders.map((h, i) => (
                            <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Email do Cliente</Label>
                      <Select
                        value={salesMapping.client_email || ""}
                        onValueChange={(v) => setSalesMapping({ ...salesMapping, client_email: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Não mapear</SelectItem>
                          {salesHeaders.map((h, i) => (
                            <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Produto</Label>
                      <Select
                        value={salesMapping.product_name || ""}
                        onValueChange={(v) => setSalesMapping({ ...salesMapping, product_name: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Usar padrão</SelectItem>
                          {salesHeaders.map((h, i) => (
                            <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Valor Total *</Label>
                      <Select
                        value={salesMapping.total_value || ""}
                        onValueChange={(v) => setSalesMapping({ ...salesMapping, total_value: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {salesHeaders.map((h, i) => (
                            <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nº Parcelas</Label>
                      <Select
                        value={salesMapping.installments_count || ""}
                        onValueChange={(v) => setSalesMapping({ ...salesMapping, installments_count: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Padrão (1)</SelectItem>
                          {salesHeaders.map((h, i) => (
                            <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Data da Venda</Label>
                      <Select
                        value={salesMapping.sale_date || ""}
                        onValueChange={(v) => setSalesMapping({ ...salesMapping, sale_date: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Usar data atual</SelectItem>
                          {salesHeaders.map((h, i) => (
                            <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Prévia: {salesCsvData.length} linhas encontradas
                  </div>

                  <Button
                    onClick={handleImportSales}
                    disabled={salesProcessing}
                    className="w-full"
                  >
                    {salesProcessing ? (
                      <>Importando...</>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Importar {salesCsvData.length} Vendas
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateSaleModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
      />
      
      <EditSaleModal
        sale={editingSale}
        open={!!editingSale}
        onOpenChange={(open) => !open && setEditingSale(null)}
      />
      
      <SaleDetailsSheet 
        saleId={selectedSaleId}
        open={!!selectedSaleId}
        onOpenChange={(open) => !open && setSelectedSaleId(null)}
      />
    </div>
  );
}
