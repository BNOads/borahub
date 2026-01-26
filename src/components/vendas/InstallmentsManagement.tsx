import { useState } from "react";
import { useInstallmentsWithSeller, useUpdateInstallment, useSyncHotmartInstallments } from "@/hooks/useSales";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Search, CheckCircle, Clock, AlertTriangle, XCircle, Ban, RefreshCw, Check, X, CreditCard, Banknote, ChevronLeft, ChevronRight, User, ArrowUpDown, ArrowUp, ArrowDown, Calendar } from "lucide-react";
import { format, formatDistanceToNow, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const ITEMS_PER_PAGE = 20;

type SortColumn = 'external_id' | 'client_name' | 'seller' | 'product_name' | 'installment' | 'value' | 'due_date' | 'payment_date' | 'status';
type SortDirection = 'asc' | 'desc';

export function InstallmentsManagement() {
  const { data: installments, isLoading } = useInstallmentsWithSeller();
  const updateInstallment = useUpdateInstallment();
  const syncInstallments = useSyncHotmartInstallments();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Fetch last sync info
  const { data: lastSync } = useQuery({
    queryKey: ['last-installment-sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotmart_sync_logs')
        .select('*')
        .eq('sync_type', 'installments')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refetch every minute
  });
  
  // All installments already come from sales with assigned seller
  const baseInstallments = installments || [];
  
  // Helper function to get date range based on filter
  const getDateRange = () => {
    const today = new Date();
    switch (dateFilter) {
      case "this_week":
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
      case "this_month":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "last_month":
        const lastMonth = subMonths(today, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "custom":
        return { start: customDateRange.from, end: customDateRange.to };
      default:
        return null;
    }
  };

  const filteredInstallments = baseInstallments.filter(inst => {
    const matchesSearch = 
      inst.sale?.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.sale?.external_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.sale?.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || inst.status === statusFilter;
    
    // Filter by payment type (à vista = 1 installment, parcelado = multiple)
    const isAVista = inst.total_installments === 1;
    const matchesPaymentType = 
      paymentTypeFilter === "all" || 
      (paymentTypeFilter === "avista" && isAVista) ||
      (paymentTypeFilter === "parcelado" && !isAVista);
    
    // Filter by platform
    const matchesPlatform = platformFilter === "all" || inst.sale?.platform === platformFilter;
    
    // Filter by date range (due_date)
    let matchesDate = true;
    const dateRange = getDateRange();
    if (dateRange && dateRange.start && dateRange.end) {
      const dueDate = parseISO(inst.due_date);
      matchesDate = isWithinInterval(dueDate, { start: dateRange.start, end: dateRange.end });
    }
    
    return matchesSearch && matchesStatus && matchesPaymentType && matchesPlatform && matchesDate;
  });
  
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
  
  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };
  
  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };
  
  // Sort filtered installments
  const sortedInstallments = [...filteredInstallments].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortColumn) {
      case 'external_id':
        return direction * (a.sale?.external_id || '').localeCompare(b.sale?.external_id || '');
      case 'client_name':
        return direction * (a.sale?.client_name || '').localeCompare(b.sale?.client_name || '');
      case 'seller':
        return direction * (a.sale?.seller?.full_name || '').localeCompare(b.sale?.seller?.full_name || '');
      case 'product_name':
        return direction * (a.sale?.product_name || '').localeCompare(b.sale?.product_name || '');
      case 'installment':
        const aVal = a.total_installments === 1 ? 0 : a.installment_number;
        const bVal = b.total_installments === 1 ? 0 : b.installment_number;
        return direction * (aVal - bVal);
      case 'value':
        return direction * (a.value - b.value);
      case 'due_date':
        return direction * (new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      case 'payment_date':
        const aDate = a.payment_date ? new Date(a.payment_date).getTime() : 0;
        const bDate = b.payment_date ? new Date(b.payment_date).getTime() : 0;
        return direction * (aDate - bDate);
      case 'status':
        return direction * a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });
  
  // Pagination
  const totalPages = Math.ceil(sortedInstallments.length / ITEMS_PER_PAGE);
  const paginatedInstallments = sortedInstallments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  // Stats
  const stats = {
    total: sortedInstallments.length,
    pending: sortedInstallments.filter(i => i.status === 'pending').length,
    paid: sortedInstallments.filter(i => i.status === 'paid').length,
    overdue: sortedInstallments.filter(i => i.status === 'overdue').length,
  };
  
  // Render sort icon
  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
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
          <Select value={statusFilter} onValueChange={(v) => handleFilterChange(setStatusFilter, v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="paid">Pagas</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
              <SelectItem value="refunded">Estornadas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentTypeFilter} onValueChange={(v) => handleFilterChange(setPaymentTypeFilter, v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="avista">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  À Vista
                </div>
              </SelectItem>
              <SelectItem value="parcelado">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Parcelado
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={(v) => handleFilterChange(setPlatformFilter, v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Plataformas</SelectItem>
              <SelectItem value="hotmart">Hotmart</SelectItem>
              <SelectItem value="asaas">Asaas</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v) => handleFilterChange(setDateFilter, v)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Datas</SelectItem>
              <SelectItem value="this_week">Esta Semana</SelectItem>
              <SelectItem value="this_month">Este Mês</SelectItem>
              <SelectItem value="last_month">Mês Anterior</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {dateFilter === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {customDateRange.from ? (
                    customDateRange.to ? (
                      <>
                        {format(customDateRange.from, "dd/MM/yy")} - {format(customDateRange.to, "dd/MM/yy")}
                      </>
                    ) : (
                      format(customDateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>Selecione o período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={{ from: customDateRange.from, to: customDateRange.to }}
                  onSelect={(range) => {
                    setCustomDateRange({ from: range?.from, to: range?.to });
                    setCurrentPage(1);
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <Button 
            onClick={() => syncInstallments.mutate()} 
            disabled={syncInstallments.isPending}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncInstallments.isPending ? 'animate-spin' : ''}`} />
            {syncInstallments.isPending ? 'Sincronizando...' : 'Sincronizar Hotmart e Asaas'}
          </Button>
          {lastSync && (
            <span className="text-xs text-muted-foreground">
              Última sincronização: {formatDistanceToNow(new Date(lastSync.completed_at || lastSync.started_at), { addSuffix: true, locale: ptBR })}
              {lastSync.status === 'success' && (
                <CheckCircle className="inline h-3 w-3 ml-1 text-success" />
              )}
              {lastSync.status === 'partial' && (
                <AlertTriangle className="inline h-3 w-3 ml-1 text-warning" />
              )}
            </span>
          )}
        </div>
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
                  <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('external_id')}>
                    <div className="flex items-center">ID Venda {renderSortIcon('external_id')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('client_name')}>
                    <div className="flex items-center">Cliente {renderSortIcon('client_name')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('seller')}>
                    <div className="flex items-center">Vendedor {renderSortIcon('seller')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('product_name')}>
                    <div className="flex items-center">Produto {renderSortIcon('product_name')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('installment')}>
                    <div className="flex items-center">Parcela {renderSortIcon('installment')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('value')}>
                    <div className="flex items-center">Valor {renderSortIcon('value')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('due_date')}>
                    <div className="flex items-center">Vencimento {renderSortIcon('due_date')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('payment_date')}>
                    <div className="flex items-center">Pagamento {renderSortIcon('payment_date')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('status')}>
                    <div className="flex items-center">Status {renderSortIcon('status')}</div>
                  </TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : paginatedInstallments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Nenhuma parcela encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInstallments.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-mono text-xs">
                        {inst.sale?.external_id}
                      </TableCell>
                      <TableCell>{inst.sale?.client_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{inst.sale?.seller?.full_name || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{inst.sale?.product_name}</TableCell>
                      <TableCell>
                        {inst.total_installments === 1 ? (
                          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 flex items-center gap-1 w-fit">
                            <Banknote className="h-3 w-3" />
                            À Vista
                          </Badge>
                        ) : (
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3 text-muted-foreground" />
                            {inst.installment_number}/{inst.total_installments}
                          </span>
                        )}
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
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedInstallments.length)} de {sortedInstallments.length} parcelas
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm font-medium px-2">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
