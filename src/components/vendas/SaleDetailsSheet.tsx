import { useSale, useInstallments, useUpdateSaleStatus } from "@/hooks/useSales";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/components/funnel-panel/types";
import { format } from "date-fns";
import { XCircle, CheckCircle, Clock, AlertTriangle, Ban } from "lucide-react";

interface SaleDetailsSheetProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetailsSheet({ saleId, open, onOpenChange }: SaleDetailsSheetProps) {
  const { data: sale, isLoading: saleLoading } = useSale(saleId || "");
  const { data: installments, isLoading: installmentsLoading } = useInstallments(saleId || undefined);
  const updateStatus = useUpdateSaleStatus();
  
  if (!saleId) return null;
  
  const isLoading = saleLoading || installmentsLoading;
  
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
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes da Venda</SheetTitle>
        </SheetHeader>
        
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : sale ? (
          <div className="space-y-6 mt-6">
            {/* Sale Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono">
                  {sale.external_id}
                </Badge>
                <Badge variant={sale.status === 'active' ? 'default' : 'destructive'}>
                  {sale.status === 'active' ? 'Ativa' : 'Cancelada'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{sale.client_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{sale.seller?.full_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Produto</p>
                  <p className="font-medium">{sale.product_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plataforma</p>
                  <p className="font-medium capitalize">{sale.platform}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="font-medium">{formatCurrency(sale.total_value)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Comissão</p>
                  <p className="font-medium">{sale.commission_percent}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data da Venda</p>
                  <p className="font-medium">{format(new Date(sale.sale_date), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Parcelas</p>
                  <p className="font-medium">{sale.installments_count}x</p>
                </div>
              </div>
              
              {sale.status === 'active' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => updateStatus.mutate({ id: sale.id, status: 'cancelled' })}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar Venda
                </Button>
              )}
            </div>
            
            <Separator />
            
            {/* Installments */}
            <div>
              <h3 className="font-semibold mb-4">Parcelas</h3>
              <div className="space-y-2">
                {installments?.map((inst) => (
                  <div 
                    key={inst.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${statusColors[inst.status]}`}>
                        {statusIcons[inst.status]}
                      </div>
                      <div>
                        <p className="font-medium">
                          Parcela {inst.installment_number}/{inst.total_installments}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vencimento: {format(new Date(inst.due_date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(inst.value)}</p>
                      <Badge variant="outline" className={`text-xs ${statusColors[inst.status]}`}>
                        {statusLabels[inst.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Venda não encontrada
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
