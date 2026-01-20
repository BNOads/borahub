import { useState, useMemo } from "react";
import { useSales, Sale } from "@/hooks/useSales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, Eye, Pencil, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { format } from "date-fns";
import { CreateSaleModal } from "./CreateSaleModal";
import { EditSaleModal } from "./EditSaleModal";
import { SaleDetailsSheet } from "./SaleDetailsSheet";

type SortField = "external_id" | "client_name" | "product_name" | "seller" | "total_value" | "installments_count" | "platform" | "sale_date" | "status";
type SortDirection = "asc" | "desc";

export function SalesManagement() {
  const { data: sales, isLoading } = useSales();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  
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
    
    // Apply platform filter
    if (platformFilter !== "all") {
      result = result.filter(sale => sale.platform === platformFilter);
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
        case "platform":
          aValue = a.platform;
          bValue = b.platform;
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
  }, [sales, searchTerm, statusFilter, platformFilter, sortField, sortDirection]);
  
  const platformColors = {
    hotmart: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    asaas: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };
  
  return (
    <div className="space-y-4">
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
          
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Plataformas</SelectItem>
              <SelectItem value="hotmart">Hotmart</SelectItem>
              <SelectItem value="asaas">Asaas</SelectItem>
            </SelectContent>
          </Select>
          
          {(statusFilter !== "all" || platformFilter !== "all") && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setPlatformFilter("all");
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

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
                    onClick={() => handleSort("platform")}
                  >
                    <div className="flex items-center">
                      Plataforma
                      <SortIcon field="platform" />
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
                    <TableRow key={sale.id}>
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
                        <Badge 
                          variant="outline" 
                          className={platformColors[sale.platform]}
                        >
                          {sale.platform === 'hotmart' ? 'Hotmart' : 'Asaas'}
                        </Badge>
                      </TableCell>
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
