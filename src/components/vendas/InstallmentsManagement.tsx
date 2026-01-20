import { useState } from "react";
import { useInstallments, useUpdateInstallment, useSyncHotmartInstallments } from "@/hooks/useSales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Search, CheckCircle, Clock, AlertTriangle, XCircle, Ban, RefreshCw, Check, X } from "lucide-react";
import { format } from "date-fns";

export function InstallmentsManagement() {
  const { data: installments, isLoading } = useInstallments();
  const updateInstallment = useUpdateInstallment();
  const syncInstallments = useSyncHotmartInstallments();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const filteredInstallments = installments?.filter(inst => {
    const matchesSearch = 
      inst.sale?.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.sale?.external_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.sale?.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || inst.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];
  
  const statusIcons = {
    pending: <Clock className="h-4 w-4" />,
    paid: <CheckCircle className="h-4 w-4" />,
    overdue: <AlertTriangle className="h-4 w-4" />,
    cancelled: <XCircle className="h-4 w-4" />,
    refunded: <Ban className="h-4 w-4" />,
  };
  
  const statusColors = {
    pending: "bg-muted text-muted-foreground",
    paid: "bg-success/10 text-success border-success/20",
    overdue: "bg-destructive/10 text-destructive border-destructive/20",
    cancelled: "bg-muted text-muted-foreground",
    refunded: "bg-warning/10 text-warning border-warning/20",
  };
  
  const statusLabels = {
    pending: "Pendente",
    paid: "Paga",
    overdue: "Atrasada",
    cancelled: "Cancelada",
    refunded: "Estornada",
  };
  
  function handleStatusChange(installmentId: string, newStatus: string) {
    updateInstallment.mutate({
      id: installmentId,
      status: newStatus as any,
      payment_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
    });
  }
  
  function handleQuickToggle(installmentId: string, currentStatus: string) {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    handleStatusChange(installmentId, newStatus);
  }
  
  // Stats
  const stats = {
    total: filteredInstallments.length,
    pending: filteredInstallments.filter(i => i.status === 'pending').length,
    paid: filteredInstallments.filter(i => i.status === 'paid').length,
    overdue: filteredInstallments.filter(i => i.status === 'overdue').length,
  };
  
  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de Parcelas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-success">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">Pagas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Atrasadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar parcelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="paid">Pagas</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
              <SelectItem value="refunded">Estornadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={() => syncInstallments.mutate()} 
          disabled={syncInstallments.isPending}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncInstallments.isPending ? 'animate-spin' : ''}`} />
          {syncInstallments.isPending ? 'Sincronizando...' : 'Sincronizar Hotmart'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestão de Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Venda</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredInstallments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhuma parcela encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInstallments.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-mono text-xs">
                        {inst.sale?.external_id}
                      </TableCell>
                      <TableCell>{inst.sale?.client_name}</TableCell>
                      <TableCell>{inst.sale?.product_name}</TableCell>
                      <TableCell>
                        {inst.installment_number}/{inst.total_installments}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(inst.value)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(inst.due_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        {inst.payment_date 
                          ? format(new Date(inst.payment_date), 'dd/MM/yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 w-fit ${statusColors[inst.status]}`}
                        >
                          {statusIcons[inst.status]}
                          {statusLabels[inst.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={inst.status === 'paid' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleQuickToggle(inst.id, inst.status)}
                            disabled={updateInstallment.isPending}
                            className={inst.status === 'paid' ? 'bg-success hover:bg-success/90' : ''}
                          >
                            {inst.status === 'paid' ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Paga
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Marcar Paga
                              </>
                            )}
                          </Button>
                          <Select 
                            value={inst.status}
                            onValueChange={(value) => handleStatusChange(inst.id, value)}
                            disabled={updateInstallment.isPending}
                          >
                            <SelectTrigger className="w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="paid">Paga</SelectItem>
                              <SelectItem value="overdue">Atrasada</SelectItem>
                              <SelectItem value="cancelled">Cancelada</SelectItem>
                              <SelectItem value="refunded">Estornada</SelectItem>
                            </SelectContent>
                          </Select>
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
    </div>
  );
}
