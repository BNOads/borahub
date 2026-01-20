import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  RefreshCw, 
  Download, 
  Package, 
  ShoppingCart, 
  Loader2, 
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface HotmartProduct {
  id: number;
  name: string;
  ucode: string;
  status: string;
}

interface HotmartSale {
  transaction: string;
  product: { id: number; name: string };
  buyer: { name: string; email: string };
  purchase: {
    approved_date?: number;
    status: string;
    price: { value: number };
    payment: { installments_number: number };
  };
}

interface SyncResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors?: string[];
}

// Fetch sellers for dropdown
function useSellers() {
  return useQuery({
    queryKey: ["sellers"],
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

export function HotmartSync() {
  const { data: sellers } = useSellers();
  
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  
  // Results
  const [products, setProducts] = useState<HotmartProduct[]>([]);
  const [sales, setSales] = useState<HotmartSale[]>([]);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  
  async function callHotmartApi(action: string, params: Record<string, any> = {}) {
    setLoading(true);
    setActiveAction(action);
    
    try {
      const { data, error } = await supabase.functions.invoke("hotmart-sync", {
        body: { action, ...params },
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    } catch (error: any) {
      console.error("Hotmart API error:", error);
      toast.error(error.message || "Erro ao conectar com a Hotmart");
      throw error;
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  }
  
  async function handleFetchProducts() {
    try {
      const data = await callHotmartApi("get_products");
      setProducts(data.products || []);
      toast.success(`${data.products?.length || 0} produtos carregados`);
    } catch (error) {
      // Error already handled
    }
  }
  
  async function handleFetchSales() {
    try {
      const data = await callHotmartApi("get_sales", {
        startDate,
        endDate,
        status: statusFilter || undefined,
      });
      setSales(data.sales || []);
      toast.success(`${data.sales?.length || 0} vendas carregadas`);
    } catch (error) {
      // Error already handled
    }
  }
  
  async function handleSyncSales() {
    if (!selectedSeller) {
      toast.error("Selecione um vendedor para vincular as vendas");
      return;
    }
    
    try {
      const data = await callHotmartApi("sync_sales", {
        startDate,
        endDate,
        sellerId: selectedSeller,
      });
      setSyncResult(data);
      
      if (data.failed === 0) {
        toast.success(`Sincronização concluída: ${data.created} criados, ${data.updated} atualizados`);
      } else {
        toast.warning(`Sincronização com erros: ${data.created} criados, ${data.updated} atualizados, ${data.failed} falhas`);
      }
    } catch (error) {
      // Error already handled
    }
  }
  
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
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium">Integração com Hotmart</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Sincronize vendas, parcelas e produtos diretamente da API da Hotmart. 
                As vendas importadas serão vinculadas ao vendedor selecionado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="sync">
        <TabsList>
          <TabsTrigger value="sync">Sincronizar Vendas</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="preview">Visualizar Vendas</TabsTrigger>
        </TabsList>
        
        {/* Sync Tab */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sincronizar Vendas da Hotmart
              </CardTitle>
              <CardDescription>
                Importe vendas e parcelas automaticamente. As comissões serão calculadas conforme configuração do produto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Vendedor *</Label>
                  <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers?.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.display_name || seller.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleSyncSales} 
                    disabled={loading || !selectedSeller}
                    className="w-full"
                  >
                    {loading && activeAction === "sync_sales" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Sincronizar
                  </Button>
                </div>
              </div>
              
              {/* Sync Result */}
              {syncResult && (
                <div className="mt-6 p-4 bg-muted/30 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    {syncResult.failed === 0 ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    )}
                    <h4 className="font-medium">Resultado da Sincronização</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-background rounded-lg">
                      <div className="text-2xl font-bold">{syncResult.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center p-3 bg-success/10 rounded-lg">
                      <div className="text-2xl font-bold text-success">{syncResult.created}</div>
                      <div className="text-xs text-muted-foreground">Criados</div>
                    </div>
                    <div className="text-center p-3 bg-accent/10 rounded-lg">
                      <div className="text-2xl font-bold text-accent">{syncResult.updated}</div>
                      <div className="text-xs text-muted-foreground">Atualizados</div>
                    </div>
                    <div className="text-center p-3 bg-destructive/10 rounded-lg">
                      <div className="text-2xl font-bold text-destructive">{syncResult.failed}</div>
                      <div className="text-xs text-muted-foreground">Falhas</div>
                    </div>
                  </div>
                  
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium mb-2">Erros:</h5>
                      <ul className="text-sm text-destructive space-y-1">
                        {syncResult.errors.map((error, i) => (
                          <li key={i} className="font-mono text-xs">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produtos da Hotmart
                  </CardTitle>
                  <CardDescription>
                    Visualize os produtos cadastrados na sua conta Hotmart
                  </CardDescription>
                </div>
                <Button onClick={handleFetchProducts} disabled={loading}>
                  {loading && activeAction === "get_products" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Carregar Produtos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {products.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono">{product.id}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="font-mono text-xs">{product.ucode}</TableCell>
                        <TableCell>
                          <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>
                            {product.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Clique em "Carregar Produtos" para buscar os produtos da Hotmart
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Preview Sales Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Visualizar Vendas
                  </CardTitle>
                  <CardDescription>
                    Visualize vendas da Hotmart antes de sincronizar
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  {loading && activeAction === "get_sales" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Buscar Vendas
                </Button>
              </div>
              
              {sales.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transação</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Parcelas</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.transaction}>
                          <TableCell className="font-mono text-xs">{sale.transaction}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{sale.product.name}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{sale.buyer.name}</div>
                              <div className="text-xs text-muted-foreground">{sale.buyer.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(sale.purchase.price.value)}
                          </TableCell>
                          <TableCell>{sale.purchase.payment.installments_number || 1}x</TableCell>
                          <TableCell>
                            {sale.purchase.approved_date
                              ? format(new Date(sale.purchase.approved_date), "dd/MM/yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>{formatStatus(sale.purchase.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Defina os filtros e clique em "Buscar Vendas" para visualizar
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
