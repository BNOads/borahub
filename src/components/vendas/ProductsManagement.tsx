import { useState } from "react";
import { useProducts, useCreateProduct, useUpdateProduct } from "@/hooks/useSales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Package, Loader2 } from "lucide-react";

interface ProductFormData {
  name: string;
  description: string;
  default_commission_percent: number;
  is_active: boolean;
}

export function ProductsManagement() {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    default_commission_percent: 10,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  
  function resetForm() {
    setFormData({
      name: "",
      description: "",
      default_commission_percent: 10,
      is_active: true,
    });
  }
  
  function handleEditProduct(product: any) {
    setFormData({
      name: product.name,
      description: product.description || "",
      default_commission_percent: Number(product.default_commission_percent),
      is_active: product.is_active,
    });
    setEditingProduct(product.id);
  }
  
  async function handleSaveProduct() {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct,
          ...formData,
        });
        setEditingProduct(null);
      } else {
        await createProduct.mutateAsync(formData);
        setShowCreateModal(false);
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  }
  
  const ProductForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Produto *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
          placeholder="Nome do produto"
        />
      </div>
      
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
          placeholder="Descrição do produto"
          rows={3}
        />
      </div>
      
      <div>
        <Label htmlFor="commission">Comissão Padrão (%)</Label>
        <Input
          id="commission"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={formData.default_commission_percent}
          onChange={(e) => setFormData(f => ({ ...f, default_commission_percent: parseFloat(e.target.value) }))}
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Switch
          id="active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))}
        />
        <Label htmlFor="active">Produto Ativo</Label>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button 
          variant="outline" 
          onClick={() => {
            resetForm();
            setShowCreateModal(false);
            setEditingProduct(null);
          }}
        >
          Cancelar
        </Button>
        <Button onClick={handleSaveProduct} disabled={saving || !formData.name.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {editingProduct ? "Salvar" : "Criar Produto"}
        </Button>
      </div>
    </div>
  );
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Produto</DialogTitle>
            </DialogHeader>
            <ProductForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Comissão Padrão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : products?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum produto cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  products?.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {product.description || '-'}
                      </TableCell>
                      <TableCell>{product.default_commission_percent}%</TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog 
                          open={editingProduct === product.id} 
                          onOpenChange={(open) => !open && setEditingProduct(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Produto</DialogTitle>
                            </DialogHeader>
                            <ProductForm />
                          </DialogContent>
                        </Dialog>
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
