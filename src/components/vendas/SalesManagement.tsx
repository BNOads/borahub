import { useState } from "react";
import { useSales } from "@/hooks/useSales";
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
import { formatCurrency } from "@/components/funnel-panel/types";
import { Plus, Search, Eye } from "lucide-react";
import { format } from "date-fns";
import { CreateSaleModal } from "./CreateSaleModal";
import { SaleDetailsSheet } from "./SaleDetailsSheet";

export function SalesManagement() {
  const { data: sales, isLoading } = useSales();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  
  const filteredSales = sales?.filter(sale => 
    sale.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.external_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.seller?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const platformColors = {
    hotmart: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    asaas: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar vendas..."
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

      <Card>
        <CardHeader>
          <CardTitle>Vendas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Nenhuma venda encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedSaleId(sale.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
      
      <SaleDetailsSheet 
        saleId={selectedSaleId}
        open={!!selectedSaleId}
        onOpenChange={(open) => !open && setSelectedSaleId(null)}
      />
    </div>
  );
}
