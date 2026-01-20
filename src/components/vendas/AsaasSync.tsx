import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Download, CheckCircle, XCircle, Clock, Loader2, CreditCard, Eye } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  description: string;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate: string | null;
  dateCreated: string;
  installmentCount?: number;
  invoiceNumber?: string;
  invoiceUrl?: string;
  installment?: string; // ID do parcelamento (agrupa todas as parcelas)
  installmentNumber?: number; // Número da parcela atual
}

// Hook to fetch sellers
function useSellers() {
  return useQuery({
    queryKey: ["sellers-for-asaas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });
}

export function AsaasSync() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: sellers } = useSellers();

  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [previewPayments, setPreviewPayments] = useState<AsaasPayment[]>([]);
  const [activeTab, setActiveTab] = useState("sync");

  // Preview payments mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("asaas-sync", {
        body: {
          action: "get_payments",
          startDate,
          endDate,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setPreviewPayments(data.payments || []);
      toast.success(`${data.payments?.length || 0} pagamentos encontrados`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao buscar pagamentos: ${error.message}`);
    },
  });

  // Sync payments mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSeller) {
        throw new Error("Selecione um vendedor para vincular as vendas");
      }

      const { data, error } = await supabase.functions.invoke("asaas-sync", {
        body: {
          action: "sync_payments",
          startDate,
          endDate,
          sellerId: selectedSeller,
          userId: profile?.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Sincronização concluída: ${data.created} criados, ${data.updated} atualizados${
          data.failed > 0 ? `, ${data.failed} falhas` : ""
        }`
      );
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["csv-imports"] });
      setPreviewPayments([]);
    },
    onError: (error: Error) => {
      toast.error(`Erro na sincronização: ${error.message}`);
    },
  });

  // Update installments status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("asaas-sync", {
        body: {
          action: "sync_installments",
          userId: profile?.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Atualização concluída: ${data.salesChecked} vendas verificadas, ${data.installmentsUpdated} parcelas atualizadas`
      );
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro na atualização: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      RECEIVED: { label: "Pago", variant: "default" },
      CONFIRMED: { label: "Confirmado", variant: "default" },
      PENDING: { label: "Pendente", variant: "secondary" },
      OVERDUE: { label: "Vencido", variant: "destructive" },
      REFUNDED: { label: "Estornado", variant: "outline" },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Integração Asaas</CardTitle>
              <CardDescription>
                Sincronize pagamentos do Asaas com o sistema de vendas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sync" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Sincronizar
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Visualizar
              </TabsTrigger>
              <TabsTrigger value="update" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Atualizar Status
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sync" className="space-y-4 mt-4">
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
                      {sellers?.filter((seller) => seller.id).map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending || !selectedSeller}
                    className="w-full"
                  >
                    {syncMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Sincronizar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Criados</p>
                        <p className="text-2xl font-bold">
                          {syncMutation.data?.created ?? "-"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Atualizados</p>
                        <p className="text-2xl font-bold">
                          {syncMutation.data?.updated ?? "-"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Falhas</p>
                        <p className="text-2xl font-bold">
                          {syncMutation.data?.failed ?? "-"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="flex items-end">
                  <Button
                    onClick={() => previewMutation.mutate()}
                    disabled={previewMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {previewMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar Pagamentos
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {previewPayments.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID Pagamento</TableHead>
                        <TableHead>ID Parcelamento</TableHead>
                        <TableHead>Parcela</TableHead>
                        <TableHead>Nº Fatura</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Criação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-xs">
                            {payment.id}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {payment.installment || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {payment.installmentNumber ? `${payment.installmentNumber}/${payment.installmentCount || "?"}` : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {payment.invoiceNumber || "-"}
                          </TableCell>
                          <TableCell>{payment.description || "-"}</TableCell>
                          <TableCell>{formatCurrency(payment.value)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.billingType}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            {format(new Date(payment.dateCreated), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {previewPayments.length === 0 && !previewMutation.isPending && (
                <div className="text-center py-8 text-muted-foreground">
                  Clique em "Visualizar Pagamentos" para ver os dados do Asaas
                </div>
              )}
            </TabsContent>

            <TabsContent value="update" className="space-y-4 mt-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <h4 className="font-medium">Atualizar Status de Parcelas</h4>
                        <p className="text-sm text-muted-foreground">
                          Verifica o status atual dos pagamentos no Asaas e atualiza as parcelas
                          e comissões correspondentes no sistema.
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => updateStatusMutation.mutate()}
                      disabled={updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Atualizando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Atualizar Status
                        </>
                      )}
                    </Button>

                    {updateStatusMutation.data && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-sm text-muted-foreground">Vendas Verificadas</p>
                            <p className="text-2xl font-bold">
                              {updateStatusMutation.data.salesChecked}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-sm text-muted-foreground">Parcelas Atualizadas</p>
                            <p className="text-2xl font-bold">
                              {updateStatusMutation.data.installmentsUpdated}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
