import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateSale, useProducts } from "@/hooks/useSales";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  external_id: z.string().min(1, "ID obrigatório"),
  client_name: z.string().min(1, "Nome do cliente obrigatório"),
  client_email: z.string().email("Email inválido").optional().or(z.literal("")),
  client_phone: z.string().optional(),
  product_id: z.string().optional(),
  product_name: z.string().min(1, "Nome do produto obrigatório"),
  total_value: z.coerce.number().positive("Valor deve ser positivo"),
  installments_count: z.coerce.number().int().min(1).max(24),
  platform: z.enum(["manual", "hotmart", "asaas"]),
  seller_id: z.string().min(1, "Vendedor obrigatório"),
  commission_percent: z.coerce.number().min(0).max(100),
  sale_date: z.string().min(1, "Data obrigatória"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSaleModal({ open, onOpenChange }: CreateSaleModalProps) {
  const { data: products } = useProducts();
  const createSale = useCreateSale();
  const [sellers, setSellers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "success" | "error">("idle");
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      external_id: "",
      client_name: "",
      client_email: "",
      client_phone: "",
      product_id: "",
      product_name: "",
      total_value: 0,
      installments_count: 1,
      platform: "manual",
      seller_id: "",
      commission_percent: 10,
      sale_date: new Date().toISOString().split("T")[0],
    },
  });
  
  useEffect(() => {
    async function fetchSellers() {
      const { data: salesDept } = await supabase
        .from('departments')
        .select('id')
        .eq('name', 'Vendas')
        .single();
      
      if (salesDept) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('department_id', salesDept.id)
          .eq('is_active', true);
        
        setSellers(data || []);
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('is_active', true);
        
        setSellers(data || []);
      }
    }
    
    if (open) {
      fetchSellers();
      setLookupStatus("idle");
    }
  }, [open]);
  
  const selectedProduct = products?.find(p => p.id === form.watch("product_id"));
  
  useEffect(() => {
    if (selectedProduct) {
      form.setValue("product_name", selectedProduct.name);
      form.setValue("commission_percent", Number(selectedProduct.default_commission_percent));
    }
  }, [selectedProduct, form]);

  const lookupSale = useCallback(async () => {
    const externalId = form.getValues("external_id");
    const platform = form.getValues("platform");

    if (!externalId || externalId.length < 5) {
      toast.error("Insira um ID válido para consultar");
      return;
    }

    if (platform !== "hotmart") {
      toast.info("Consulta automática disponível apenas para Hotmart");
      return;
    }

    setLookupLoading(true);
    setLookupStatus("idle");

    try {
      const { data, error } = await supabase.functions.invoke("hotmart-sync", {
        body: { action: "get_sale_summary", transactionId: externalId },
      });

      if (error) throw error;

      const saleInfo = data?.summary?.items?.[0];
      if (!saleInfo) {
        setLookupStatus("error");
        toast.error("Venda não encontrada na Hotmart");
        return;
      }

      const buyer = saleInfo.buyer;
      const product = saleInfo.product;
      const purchase = saleInfo.purchase;

      console.log("Lookup data:", { buyer, product, purchase });

      // Use shouldDirty and shouldTouch to force re-render
      const setValueOptions = { shouldDirty: true, shouldTouch: true, shouldValidate: true };

      if (buyer?.name) form.setValue("client_name", buyer.name, setValueOptions);
      if (buyer?.email) form.setValue("client_email", buyer.email, setValueOptions);
      // Hotmart pode retornar telefone em diferentes campos
      const buyerPhone = buyer?.phone || buyer?.cellphone || buyer?.cel || "";
      if (buyerPhone) form.setValue("client_phone", buyerPhone, setValueOptions);
      if (product?.name) form.setValue("product_name", product.name, setValueOptions);
      if (purchase?.price?.value) form.setValue("total_value", purchase.price.value, setValueOptions);
      if (purchase?.payment?.installments_number) {
        form.setValue("installments_count", purchase.payment.installments_number, setValueOptions);
      }
      if (purchase?.approved_date) {
        const saleDate = new Date(purchase.approved_date).toISOString().split("T")[0];
        form.setValue("sale_date", saleDate, setValueOptions);
      } else if (purchase?.order_date) {
        const saleDate = new Date(purchase.order_date).toISOString().split("T")[0];
        form.setValue("sale_date", saleDate, setValueOptions);
      }

      if (product?.name && products) {
        const matchedProduct = products.find(
          p => p.name.toLowerCase() === product.name.toLowerCase() ||
               p.description?.includes(product.ucode)
        );
        if (matchedProduct) {
          form.setValue("product_id", matchedProduct.id, setValueOptions);
          form.setValue("commission_percent", Number(matchedProduct.default_commission_percent), setValueOptions);
        }
      }

      setLookupStatus("success");
      toast.success("Dados da venda carregados com sucesso!");
    } catch (err: any) {
      console.error("Lookup error:", err);
      setLookupStatus("error");
      toast.error("Erro ao consultar venda: " + (err.message || "Erro desconhecido"));
    } finally {
      setLookupLoading(false);
    }
  }, [form, products]);
  
  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await createSale.mutateAsync({
        external_id: values.external_id,
        client_name: values.client_name,
        client_email: values.client_email || undefined,
        client_phone: values.client_phone,
        product_id: values.product_id === "__none__" ? undefined : values.product_id,
        product_name: values.product_name,
        total_value: values.total_value,
        installments_count: values.installments_count,
        platform: values.platform,
        seller_id: values.seller_id,
        commission_percent: values.commission_percent,
        sale_date: values.sale_date,
      });
      form.reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Venda</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plataforma *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="hotmart">Hotmart (buscar dados)</SelectItem>
                        <SelectItem value="asaas">Asaas</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="external_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID da Transação *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          placeholder="Ex: HP1234567890" 
                          {...field} 
                          className="flex-1"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={lookupSale}
                        disabled={lookupLoading || form.watch("platform") !== "hotmart"}
                        title={form.watch("platform") === "hotmart" ? "Consultar na Hotmart" : "Consulta disponível apenas para Hotmart"}
                      >
                        {lookupLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : lookupStatus === "success" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : lookupStatus === "error" ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch("platform") === "hotmart" && (
              <p className="text-xs text-muted-foreground -mt-2">
                Digite o ID da transação (HP...) e clique no botão de busca para preencher automaticamente os dados.
              </p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="client_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="client_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto Cadastrado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Outro produto</SelectItem>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="product_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do produto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="total_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="installments_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade de Parcelas *</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sale_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Venda *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="seller_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendedor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o vendedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sellers.map((seller) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="commission_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comissão (%) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cadastrar Venda
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}