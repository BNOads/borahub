import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Plus, X, Search, Loader2, CreditCard } from "lucide-react";
import {
  useFunnelProducts,
  useAllProducts,
  useAddFunnelProduct,
  useRemoveFunnelProduct,
  useSalesProducts,
  useAddFunnelSalesProduct,
  useFunnelSalesProducts,
  useRemoveFunnelSalesProduct,
} from "@/hooks/useFunnelProducts";
import { formatCurrency } from "./types";

interface FunnelProductsProps {
  funnelId: string;
}

export function FunnelProducts({ funnelId }: FunnelProductsProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("cadastrados");

  const { data: linkedProducts, isLoading: loadingLinked } = useFunnelProducts(funnelId);
  const { data: linkedSalesProducts, isLoading: loadingSalesProducts } = useFunnelSalesProducts(funnelId);
  const { data: allProducts, isLoading: loadingAll } = useAllProducts();
  const { data: salesProducts, isLoading: loadingSalesAll } = useSalesProducts();
  const addProduct = useAddFunnelProduct();
  const removeProduct = useRemoveFunnelProduct();
  const addSalesProduct = useAddFunnelSalesProduct();
  const removeSalesProduct = useRemoveFunnelSalesProduct();

  const linkedProductIds = linkedProducts?.map((lp) => lp.product_id) || [];
  const linkedSalesProductNames = linkedSalesProducts || [];

  const filteredProducts = allProducts?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSalesProducts = salesProducts?.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleProduct = (productId: string, isLinked: boolean) => {
    if (isLinked) {
      removeProduct.mutate({ funnelId, productId });
    } else {
      addProduct.mutate({ funnelId, productId });
    }
  };

  const handleToggleSalesProduct = (productName: string, isLinked: boolean) => {
    if (isLinked) {
      removeSalesProduct.mutate({ funnelId, productName });
    } else {
      addSalesProduct.mutate({ funnelId, productName });
    }
  };

  const handleRemoveProduct = (productId: string) => {
    removeProduct.mutate({ funnelId, productId });
  };

  const handleRemoveSalesProduct = (productName: string) => {
    removeSalesProduct.mutate({ funnelId, productName });
  };

  if (loadingLinked || loadingSalesProducts) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Produtos Vinculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalLinked = (linkedProducts?.length || 0) + (linkedSalesProductNames?.length || 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Produtos Vinculados
            {totalLinked > 0 && (
              <Badge variant="secondary">{totalLinked}</Badge>
            )}
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-4 w-4" />
                Vincular
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Vincular Produtos ao Funil</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="cadastrados" className="gap-1.5">
                      <Package className="h-4 w-4" />
                      Cadastrados
                    </TabsTrigger>
                    <TabsTrigger value="vendas" className="gap-1.5">
                      <CreditCard className="h-4 w-4" />
                      Vendas (Asaas)
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="cadastrados">
                    <ScrollArea className="h-[300px] pr-4">
                      {loadingAll ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredProducts?.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum produto encontrado
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredProducts?.map((product) => {
                            const isLinked = linkedProductIds.includes(product.id);
                            return (
                              <div
                                key={product.id}
                                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                                onClick={() => handleToggleProduct(product.id, isLinked)}
                              >
                                <Checkbox
                                  checked={isLinked}
                                  onCheckedChange={() =>
                                    handleToggleProduct(product.id, isLinked)
                                  }
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{product.name}</p>
                                  {product.price && (
                                    <p className="text-sm text-muted-foreground">
                                      {formatCurrency(product.price)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="vendas">
                    <ScrollArea className="h-[300px] pr-4">
                      {loadingSalesAll ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredSalesProducts?.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum produto de vendas encontrado
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredSalesProducts?.map((productName) => {
                            const isLinked = linkedSalesProductNames.includes(productName);
                            return (
                              <div
                                key={productName}
                                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                                onClick={() => handleToggleSalesProduct(productName, isLinked)}
                              >
                                <Checkbox
                                  checked={isLinked}
                                  onCheckedChange={() =>
                                    handleToggleSalesProduct(productName, isLinked)
                                  }
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{productName}</p>
                                  <p className="text-xs text-muted-foreground">Via Asaas</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {totalLinked === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum produto vinculado a este funil.
          </p>
        ) : (
          <div className="space-y-2">
            {linkedProducts?.map((lp) => (
              <div
                key={lp.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {lp.product?.name || "Produto não encontrado"}
                  </span>
                  {lp.product?.price && (
                    <Badge variant="secondary" className="shrink-0">
                      {formatCurrency(lp.product.price)}
                    </Badge>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleRemoveProduct(lp.product_id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {linkedSalesProductNames?.map((productName) => (
              <div
                key={productName}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CreditCard className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="text-sm font-medium truncate">{productName}</span>
                  <Badge variant="outline" className="shrink-0 text-xs">Asaas</Badge>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleRemoveSalesProduct(productName)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
