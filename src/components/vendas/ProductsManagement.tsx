import { useState, useMemo } from "react";
import { useProducts, useCreateProduct, useUpdateProduct, useSyncHotmartProducts } from "@/hooks/useSales";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Package, Loader2, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface ProductFormData {
  name: string;
  description: string;
  default_commission_percent: number;
  is_active: boolean;
}

type SortDirection = "asc" | "desc" | null;
type SortField = "name" | "default_commission_percent";

export function ProductsManagement() {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const syncProducts = useSyncHotmartProducts();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    default_commission_percent: 10,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Filter state
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkCommission, setBulkCommission] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<string>("unchanged");
  const [bulkSaving, setBulkSaving] = useState(false);

  function isHotmartProduct(description: string | null): boolean {
    return !!description && description.includes("Hotmart ID:");
  }

  function extractHotmartInfo(description: string | null): { id: string; ucode: string } | null {
    if (!description) return null;
    const match = description.match(/Hotmart ID: (\d+) \| UCode: (\w+)/);
    if (match) {
      return { id: match[1], ucode: match[2] };
    }
    return null;
  }

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let result = [...products];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // Apply origin filter
    if (filterOrigin !== "all") {
      result = result.filter(p => {
        const isHotmart = isHotmartProduct(p.description);
        return filterOrigin === "hotmart" ? isHotmart : !isHotmart;
      });
    }

    // Apply status filter
    if (filterStatus !== "all") {
      result = result.filter(p => 
        filterStatus === "active" ? p.is_active : !p.is_active
      );
    }

    // Apply sorting
    if (sortDirection) {
      result.sort((a, b) => {
        let comparison = 0;
        if (sortField === "name") {
          comparison = a.name.localeCompare(b.name);
        } else if (sortField === "default_commission_percent") {
          comparison = a.default_commission_percent - b.default_commission_percent;
        }
        return sortDirection === "desc" ? -comparison : comparison;
      });
    }

    return result;
  }, [products, searchQuery, filterOrigin, filterStatus, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null -> asc
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field || !sortDirection) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  async function handleBulkEdit() {
    if (selectedIds.size === 0) return;

    setBulkSaving(true);
    try {
      const updates: Partial<ProductFormData> = {};
      
      if (bulkCommission && !isNaN(parseFloat(bulkCommission))) {
        updates.default_commission_percent = parseFloat(bulkCommission);
      }
      
      if (bulkStatus !== "unchanged") {
        updates.is_active = bulkStatus === "active";
      }

      if (Object.keys(updates).length === 0) {
        toast.error("Selecione pelo menos uma alteração para aplicar");
        return;
      }

      let successCount = 0;
      for (const id of selectedIds) {
        try {
          await updateProduct.mutateAsync({ id, ...updates });
          successCount++;
        } catch (error) {
          console.error(`Failed to update product ${id}:`, error);
        }
      }

      toast.success(`${successCount} produto(s) atualizado(s)`);
      setShowBulkEditModal(false);
      setSelectedIds(new Set());
      setBulkCommission("");
      setBulkStatus("unchanged");
    } finally {
      setBulkSaving(false);
    }
  }
  
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
      {/* Actions Row */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48"
          />
          <Select value={filterOrigin} onValueChange={setFilterOrigin}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="hotmart">Hotmart</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Dialog open={showBulkEditModal} onOpenChange={setShowBulkEditModal}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Editar {selectedIds.size} selecionado(s)
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edição em Massa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Alterações serão aplicadas a {selectedIds.size} produto(s) selecionado(s).
                  </p>
                  
                  <div>
                    <Label htmlFor="bulk-commission">Nova Comissão (%)</Label>
                    <Input
                      id="bulk-commission"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={bulkCommission}
                      onChange={(e) => setBulkCommission(e.target.value)}
                      placeholder="Deixe vazio para não alterar"
                    />
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select value={bulkStatus} onValueChange={setBulkStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unchanged">Não alterar</SelectItem>
                        <SelectItem value="active">Ativar todos</SelectItem>
                        <SelectItem value="inactive">Desativar todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowBulkEditModal(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleBulkEdit} disabled={bulkSaving}>
                      {bulkSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Aplicar Alterações
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button 
            variant="outline" 
            onClick={() => syncProducts.mutate()}
            disabled={syncProducts.isPending}
          >
            {syncProducts.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sincronizar Hotmart
          </Button>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos Cadastrados
            {filteredProducts.length !== products?.length && (
              <span className="text-sm font-normal text-muted-foreground">
                ({filteredProducts.length} de {products?.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      Nome
                      {getSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort("default_commission_percent")}
                  >
                    <div className="flex items-center">
                      Comissão Padrão
                      {getSortIcon("default_commission_percent")}
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {products?.length === 0 
                        ? 'Nenhum produto cadastrado. Clique em "Sincronizar Hotmart" para importar.'
                        : 'Nenhum produto encontrado com os filtros aplicados.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const hotmartInfo = extractHotmartInfo(product.description);
                    return (
                      <TableRow key={product.id} className={selectedIds.has(product.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(product.id)}
                            onCheckedChange={() => toggleSelect(product.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {hotmartInfo && (
                              <div className="text-xs text-muted-foreground">
                                ID: {hotmartInfo.id} • {hotmartInfo.ucode}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isHotmartProduct(product.description) ? (
                            <Badge variant="outline" className="bg-accent text-accent-foreground border-accent">
                              Hotmart
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Manual
                            </Badge>
                          )}
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
