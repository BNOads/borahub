import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/funnel-panel/types";
import { toast } from "sonner";
import { Search, Loader2, CheckCircle2, Clock, AlertCircle, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AssignSellerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SaleWithInstallments {
  id: string;
  external_id: string;
  client_name: string;
  client_email: string | null;
  product_name: string;
  total_value: number;
  installments_count: number;
  sale_date: string;
  platform: string;
  seller_id: string | null;
  commission_percent: number;
  installments: {
    id: string;
    installment_number: number;
    total_installments: number;
    value: number;
    due_date: string;
    status: string;
    payment_date: string | null;
    external_installment_id: string | null;
  }[];
}

function useSellers() {
  return useQuery({
    queryKey: ["sellers-for-assignment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, display_name")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });
}

export function AssignSellerModal({ open, onOpenChange }: AssignSellerModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: sellers } = useSellers();

  const [searchId, setSearchId] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [foundSale, setFoundSale] = useState<SaleWithInstallments | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchId("");
      setSelectedSeller("");
      setFoundSale(null);
      setSearchError(null);
    }
  }, [open]);

  // Search sale by external_id
  const handleSearch = async () => {
    if (!searchId.trim()) {
      setSearchError("Informe o ID do parcelamento ou transação");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setFoundSale(null);

    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          external_id,
          client_name,
          client_email,
          product_name,
          total_value,
          installments_count,
          sale_date,
          platform,
          seller_id,
          commission_percent,
          installments (
            id,
            installment_number,
            total_installments,
            value,
            due_date,
            status,
            payment_date,
            external_installment_id
          )
        `)
        .eq("external_id", searchId.trim())
        .eq("platform", "asaas")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setSearchError("Nenhuma venda Asaas encontrada com este ID");
        return;
      }

      // Sort installments by number
      const sortedInstallments = [...(data.installments || [])].sort(
        (a, b) => a.installment_number - b.installment_number
      );

      setFoundSale({
        ...data,
        installments: sortedInstallments,
      } as SaleWithInstallments);

      // If sale already has a seller, pre-select it
      if (data.seller_id) {
        setSelectedSeller(data.seller_id);
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setSearchError("Erro ao buscar venda: " + err.message);
    } finally {
      setSearching(false);
    }
  };

  // Assign seller mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!foundSale || !selectedSeller) {
        throw new Error("Selecione um vendedor");
      }

      // Update sale with seller_id
      const { error: saleError } = await supabase
        .from("sales")
        .update({
          seller_id: selectedSeller,
          updated_at: new Date().toISOString(),
        })
        .eq("id", foundSale.id);

      if (saleError) throw saleError;

      // Delete existing commissions for this sale's installments
      const installmentIds = foundSale.installments.map((i) => i.id);
      
      await supabase
        .from("commissions")
        .delete()
        .in("installment_id", installmentIds);

      // Create new commissions for each installment
      const commissionPercent = foundSale.commission_percent || 10;
      
      for (const installment of foundSale.installments) {
        const competenceMonth = new Date(installment.due_date);
        competenceMonth.setDate(1);

        const commissionValue = installment.value * (commissionPercent / 100);
        const isPaid = installment.status === "paid";

        await supabase.from("commissions").insert({
          installment_id: installment.id,
          seller_id: selectedSeller,
          installment_value: installment.value,
          commission_percent: commissionPercent,
          commission_value: commissionValue,
          competence_month: competenceMonth.toISOString().split("T")[0],
          status: isPaid ? "released" : "pending",
          released_at: isPaid ? new Date().toISOString() : null,
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success("Vendedor associado com sucesso! Comissões geradas.");
      queryClient.invalidateQueries({ queryKey: ["all-sales-db"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Erro ao associar vendedor: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
      paid: { label: "Pago", variant: "default", icon: CheckCircle2 },
      pending: { label: "Pendente", variant: "secondary", icon: Clock },
      overdue: { label: "Vencido", variant: "destructive", icon: AlertCircle },
      cancelled: { label: "Cancelado", variant: "outline", icon: AlertCircle },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const paidCount = foundSale?.installments.filter((i) => i.status === "paid").length || 0;
  const totalCount = foundSale?.installments.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Associar Vendedor a Venda Asaas
          </DialogTitle>
          <DialogDescription>
            Informe o ID do parcelamento ou transação para visualizar a venda e suas parcelas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Section */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="searchId" className="sr-only">
                ID do Parcelamento/Transação
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="searchId"
                  placeholder="Cole o ID do parcelamento ou transação..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Buscar"
              )}
            </Button>
          </div>

          {searchError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {searchError}
            </div>
          )}

          {/* Sale Info */}
          {foundSale && (
            <div className="space-y-4 border rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>
                  <p className="font-medium">{foundSale.client_name}</p>
                  {foundSale.client_email && (
                    <p className="text-xs text-muted-foreground">{foundSale.client_email}</p>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Produto:</span>
                  <p className="font-medium">{foundSale.product_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Total:</span>
                  <p className="font-medium text-primary">{formatCurrency(foundSale.total_value)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <p className="font-medium">
                    {format(new Date(foundSale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status das Parcelas:</span>
                  <p className="font-medium">
                    {paidCount} de {totalCount} pagas
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Comissão:</span>
                  <p className="font-medium">{foundSale.commission_percent}%</p>
                </div>
              </div>

              {/* Installments Table */}
              <div>
                <h4 className="text-sm font-medium mb-2">Parcelas ({totalCount})</h4>
                <div className="rounded-md border max-h-[200px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Parcela</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {foundSale.installments.map((inst) => (
                        <TableRow key={inst.id}>
                          <TableCell className="font-medium">
                            {inst.installment_number}/{inst.total_installments}
                          </TableCell>
                          <TableCell>{formatCurrency(inst.value)}</TableCell>
                          <TableCell>
                            {format(new Date(inst.due_date), "dd/MM/yy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {inst.payment_date
                              ? format(new Date(inst.payment_date), "dd/MM/yy", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(inst.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Seller Selection */}
              <div className="space-y-2">
                <Label htmlFor="seller">Vendedor *</Label>
                <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                  <SelectTrigger id="seller">
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers?.filter((s) => s.id).map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.display_name || seller.full_name}
                        <span className="text-muted-foreground ml-2">({seller.email})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {foundSale.seller_id && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  ⚠️ Esta venda já possui um vendedor associado. Ao confirmar, as comissões serão recalculadas.
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={!foundSale || !selectedSeller || assignMutation.isPending}
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar Associação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
