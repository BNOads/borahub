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
import { XCircle, CheckCircle, Clock, AlertTriangle, Ban, Copy, ExternalLink, Globe } from "lucide-react";
import { toast } from "sonner";

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
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {sale.external_id}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      navigator.clipboard.writeText(sale.external_id);
                      toast.success("ID copiado!");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
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
                  <p className="text-xs text-muted-foreground">Comissão (%)</p>
                  <p className="font-medium">{sale.commission_percent}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Comissão</p>
                  <p className="font-medium text-primary">{formatCurrency((sale.total_value * sale.commission_percent) / 100)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data da Venda</p>
                  <p className="font-medium">{format(new Date(sale.sale_date), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Parcelas</p>
                  <p className="font-medium">{sale.installments_count}x</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Meio de Pagamento</p>
                  <p className="font-medium">{(sale as any).payment_type || '-'}</p>
                </div>
                {(sale as any).proof_link && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Link de Comprovação</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => window.open((sale as any).proof_link, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="truncate">{(sale as any).proof_link}</span>
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Tracking / UTM Info */}
              {((sale as any).tracking_source || (sale as any).tracking_source_sck || (sale as any).tracking_external_code) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Origem do Tráfego
                    </h4>
                    <div className="grid grid-cols-1 gap-3 bg-muted/30 p-3 rounded-lg">
                      {(sale as any).tracking_source && (
                        <div>
                          <p className="text-xs text-muted-foreground">Fonte</p>
                          <p className="font-medium">{(sale as any).tracking_source}</p>
                        </div>
                      )}
                      {(sale as any).tracking_source_sck && (
                        <div>
                          <p className="text-xs text-muted-foreground">Source SCK / SRC</p>
                          <div className="flex items-center gap-2">
                            <p className="font-medium font-mono text-sm break-all">{(sale as any).tracking_source_sck}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText((sale as any).tracking_source_sck);
                                toast.success("Copiado!");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {(sale as any).tracking_external_code && (
                        <div>
                          <p className="text-xs text-muted-foreground">Código Externo (UTM)</p>
                          <div className="flex items-center gap-2">
                            <p className="font-medium font-mono text-sm break-all">{(sale as any).tracking_external_code}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText((sale as any).tracking_external_code);
                                toast.success("Copiado!");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              
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
