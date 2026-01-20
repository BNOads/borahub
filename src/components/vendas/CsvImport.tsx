import { useState, useRef } from "react";
import { useCreateCsvImport, useCsvImports, useProducts } from "@/hooks/useSales";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, ShoppingCart, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface CsvRecord {
  external_id: string;
  installment_number: number;
  value: number;
  status: string;
  payment_date?: string;
}

interface SaleRecord {
  external_id: string;
  client_name: string;
  client_email?: string;
  product_name: string;
  total_value: number;
  installments_count: number;
  sale_date: string;
  seller_id: string;
  commission_percent: number;
}

function useSellers() {
  return useQuery({
    queryKey: ["sellers-csv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, display_name")
        .eq("is_active", true)
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });
}

export function CsvImport() {
  const { data: imports, isLoading: importsLoading } = useCsvImports();
  const { data: products } = useProducts();
  const { data: sellers } = useSellers();
  const createImport = useCreateCsvImport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const salesFileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState("installments");
  const [platform, setPlatform] = useState<"hotmart" | "asaas">("hotmart");
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  
  // Sales import state
  const [salesCsvData, setSalesCsvData] = useState<string[][]>([]);
  const [salesHeaders, setSalesHeaders] = useState<string[]>([]);
  const [salesMapping, setSalesMapping] = useState<Record<string, string>>({});
  const [selectedSeller, setSelectedSeller] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [defaultCommission, setDefaultCommission] = useState("10");
  const [salesProcessing, setSalesProcessing] = useState(false);
  
  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      
      if (parsed.length > 0) {
        setHeaders(parsed[0]);
        setCsvData(parsed.slice(1));
        autoMapInstallmentColumns(parsed[0]);
      }
    };
    reader.readAsText(file);
  }

  function handleSalesFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      
      if (parsed.length > 0) {
        setSalesHeaders(parsed[0]);
        setSalesCsvData(parsed.slice(1));
        autoMapSalesColumns(parsed[0]);
      }
    };
    reader.readAsText(file);
  }

  function parseCSV(text: string): string[][] {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  }

  function autoMapInstallmentColumns(headers: string[]) {
    const autoMapping: Record<string, string> = {};
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      if ((lowerHeader.includes('id') || lowerHeader.includes('transação') || lowerHeader.includes('transaction')) && !autoMapping.external_id) {
        autoMapping.external_id = String(index);
      }
      if (lowerHeader.includes('parcela') || lowerHeader.includes('installment') || lowerHeader.includes('recorrência')) {
        autoMapping.installment_number = String(index);
      }
      if (lowerHeader.includes('valor') || lowerHeader.includes('value') || lowerHeader.includes('amount') || lowerHeader.includes('price')) {
        autoMapping.value = String(index);
      }
      if (lowerHeader.includes('status')) {
        autoMapping.status = String(index);
      }
      if (lowerHeader.includes('pagamento') || lowerHeader.includes('payment') || lowerHeader.includes('data')) {
        autoMapping.payment_date = String(index);
      }
    });
    setMapping(autoMapping);
  }

  function autoMapSalesColumns(headers: string[]) {
    const autoMapping: Record<string, string> = {};
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      if ((lowerHeader.includes('id') || lowerHeader.includes('transação') || lowerHeader.includes('transaction')) && !autoMapping.external_id) {
        autoMapping.external_id = String(index);
      }
      if (lowerHeader.includes('cliente') || lowerHeader.includes('comprador') || lowerHeader.includes('buyer') || lowerHeader.includes('customer') || lowerHeader.includes('name')) {
        if (!autoMapping.client_name) autoMapping.client_name = String(index);
      }
      if (lowerHeader.includes('email')) {
        autoMapping.client_email = String(index);
      }
      if (lowerHeader.includes('produto') || lowerHeader.includes('product')) {
        autoMapping.product_name = String(index);
      }
      if (lowerHeader.includes('valor') || lowerHeader.includes('value') || lowerHeader.includes('total') || lowerHeader.includes('price')) {
        if (!autoMapping.total_value) autoMapping.total_value = String(index);
      }
      if (lowerHeader.includes('parcelas') || lowerHeader.includes('installments')) {
        autoMapping.installments_count = String(index);
      }
      if (lowerHeader.includes('data') || lowerHeader.includes('date')) {
        if (!autoMapping.sale_date) autoMapping.sale_date = String(index);
      }
    });
    setSalesMapping(autoMapping);
  }
  
  async function handleImportInstallments() {
    if (!mapping.external_id || !mapping.installment_number || !mapping.value || !mapping.status) {
      toast.error("Por favor, mapeie todos os campos obrigatórios");
      return;
    }
    
    setProcessing(true);
    
    try {
      const records: CsvRecord[] = csvData.map(row => ({
        external_id: row[parseInt(mapping.external_id)] || '',
        installment_number: parseInt(row[parseInt(mapping.installment_number)]) || 1,
        value: parseFloat(row[parseInt(mapping.value)]?.replace(',', '.').replace(/[^\d.-]/g, '')) || 0,
        status: row[parseInt(mapping.status)] || 'pending',
        payment_date: mapping.payment_date ? row[parseInt(mapping.payment_date)] : undefined,
      })).filter(r => r.external_id);
      
      await createImport.mutateAsync({
        platform,
        filename: fileInputRef.current?.files?.[0]?.name || 'import.csv',
        records,
      });
      
      // Reset form
      setCsvData([]);
      setHeaders([]);
      setMapping({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setProcessing(false);
    }
  }

  async function handleImportSales() {
    if (!salesMapping.external_id || !salesMapping.client_name || !salesMapping.total_value) {
      toast.error("Por favor, mapeie os campos obrigatórios: ID, Cliente e Valor");
      return;
    }

    if (!selectedSeller) {
      toast.error("Selecione um vendedor");
      return;
    }
    
    setSalesProcessing(true);
    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];
    
    try {
      for (const row of salesCsvData) {
        try {
          const externalId = row[parseInt(salesMapping.external_id)] || '';
          if (!externalId) continue;

          const clientName = row[parseInt(salesMapping.client_name)] || 'Cliente';
          const clientEmail = salesMapping.client_email ? row[parseInt(salesMapping.client_email)] : undefined;
          const productName = salesMapping.product_name ? row[parseInt(salesMapping.product_name)] : (selectedProduct ? products?.find(p => p.id === selectedProduct)?.name : 'Produto');
          const totalValue = parseFloat(row[parseInt(salesMapping.total_value)]?.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
          const installmentsCount = salesMapping.installments_count ? parseInt(row[parseInt(salesMapping.installments_count)]) || 1 : 1;
          
          let saleDate = new Date().toISOString().split('T')[0];
          if (salesMapping.sale_date) {
            const dateStr = row[parseInt(salesMapping.sale_date)];
            if (dateStr) {
              // Try different date formats
              const parsed = new Date(dateStr);
              if (!isNaN(parsed.getTime())) {
                saleDate = parsed.toISOString().split('T')[0];
              } else {
                // Try DD/MM/YYYY format
                const parts = dateStr.split(/[\/\-]/);
                if (parts.length === 3) {
                  const [d, m, y] = parts;
                  const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
                  if (!isNaN(date.getTime())) {
                    saleDate = date.toISOString().split('T')[0];
                  }
                }
              }
            }
          }

          // Check if sale exists
          const { data: existingSale } = await supabase
            .from('sales')
            .select('id')
            .eq('external_id', externalId)
            .maybeSingle();

          if (existingSale) {
            // Update existing sale
            await supabase
              .from('sales')
              .update({
                client_name: clientName,
                client_email: clientEmail || null,
                product_name: productName || 'Produto',
                total_value: totalValue,
                installments_count: installmentsCount,
              })
              .eq('id', existingSale.id);
            updated++;
          } else {
            // Create new sale
            const { data: newSale, error: saleError } = await supabase
              .from('sales')
              .insert({
                external_id: externalId,
                client_name: clientName,
                client_email: clientEmail || null,
                product_name: productName || 'Produto',
                product_id: selectedProduct || null,
                total_value: totalValue,
                installments_count: installmentsCount,
                platform,
                seller_id: selectedSeller,
                commission_percent: parseFloat(defaultCommission) || 10,
                sale_date: saleDate,
                status: 'active',
              })
              .select('id')
              .single();

            if (saleError) throw saleError;

            // Create installments
            const installmentValue = totalValue / installmentsCount;
            const installments = [];
            for (let i = 1; i <= installmentsCount; i++) {
              const dueDate = new Date(saleDate);
              dueDate.setMonth(dueDate.getMonth() + i - 1);
              installments.push({
                sale_id: newSale.id,
                installment_number: i,
                total_installments: installmentsCount,
                value: installmentValue,
                due_date: dueDate.toISOString().split('T')[0],
                status: 'pending',
              });
            }

            await supabase.from('installments').insert(installments);

            // Create commissions
            const { data: createdInstallments } = await supabase
              .from('installments')
              .select('id, value, due_date')
              .eq('sale_id', newSale.id);

            if (createdInstallments) {
              const commissions = createdInstallments.map(inst => {
                const dueDate = new Date(inst.due_date);
                const competenceMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
                return {
                  installment_id: inst.id,
                  seller_id: selectedSeller,
                  installment_value: inst.value,
                  commission_percent: parseFloat(defaultCommission) || 10,
                  commission_value: (inst.value * (parseFloat(defaultCommission) || 10)) / 100,
                  competence_month: competenceMonth.toISOString().split('T')[0],
                  status: 'pending',
                };
              });
              await supabase.from('commissions').insert(commissions);
            }

            created++;
          }
        } catch (err: any) {
          failed++;
          errors.push(err.message || 'Erro desconhecido');
        }
      }

      // Log import
      await supabase.from('csv_imports').insert({
        platform,
        filename: salesFileInputRef.current?.files?.[0]?.name || 'sales-import.csv',
        records_processed: salesCsvData.length,
        records_created: created,
        records_updated: updated,
        records_failed: failed,
        error_log: errors.length > 0 ? errors.slice(0, 20) : null,
        imported_by: (await supabase.auth.getUser()).data.user?.id,
      });

      toast.success(`Importação concluída: ${created} criados, ${updated} atualizados, ${failed} falhas`);

      // Reset form
      setSalesCsvData([]);
      setSalesHeaders([]);
      setSalesMapping({});
      if (salesFileInputRef.current) {
        salesFileInputRef.current.value = '';
      }
    } finally {
      setSalesProcessing(false);
    }
  }
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sales" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Importar Vendas
          </TabsTrigger>
          <TabsTrigger value="installments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Atualizar Parcelas
          </TabsTrigger>
        </TabsList>

        {/* Sales Import Tab */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importar Vendas via CSV
              </CardTitle>
              <CardDescription>
                Importe novas vendas de um arquivo CSV. As parcelas e comissões serão criadas automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Plataforma</Label>
                  <Select value={platform} onValueChange={(v: "hotmart" | "asaas") => setPlatform(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hotmart">Hotmart</SelectItem>
                      <SelectItem value="asaas">Asaas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Vendedor *</Label>
                  <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.display_name || s.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Produto Padrão</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Do CSV ou selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Usar nome do CSV</SelectItem>
                      {products?.filter(p => p.is_active).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Comissão (%)</Label>
                  <Input
                    type="number"
                    value={defaultCommission}
                    onChange={(e) => setDefaultCommission(e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <Label>Arquivo CSV</Label>
                <Input
                  ref={salesFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleSalesFileUpload}
                  className="mt-1"
                />
              </div>
              
              {salesHeaders.length > 0 && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium">Mapeamento de Colunas</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">ID da Venda *</label>
                      <Select 
                        value={salesMapping.external_id || ""} 
                        onValueChange={(v) => setSalesMapping(m => ({ ...m, external_id: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {salesHeaders.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Nome do Cliente *</label>
                      <Select 
                        value={salesMapping.client_name || ""} 
                        onValueChange={(v) => setSalesMapping(m => ({ ...m, client_name: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {salesHeaders.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Email do Cliente</label>
                      <Select 
                        value={salesMapping.client_email || "__none__"} 
                        onValueChange={(v) => setSalesMapping(m => ({ ...m, client_email: v === "__none__" ? "" : v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Não importar</SelectItem>
                          {salesHeaders.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Nome do Produto</label>
                      <Select 
                        value={salesMapping.product_name || "__none__"} 
                        onValueChange={(v) => setSalesMapping(m => ({ ...m, product_name: v === "__none__" ? "" : v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Usar produto padrão</SelectItem>
                          {salesHeaders.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Valor Total *</label>
                      <Select 
                        value={salesMapping.total_value || ""} 
                        onValueChange={(v) => setSalesMapping(m => ({ ...m, total_value: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {salesHeaders.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Nº de Parcelas</label>
                      <Select 
                        value={salesMapping.installments_count || "__none__"} 
                        onValueChange={(v) => setSalesMapping(m => ({ ...m, installments_count: v === "__none__" ? "" : v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Padrão (1 parcela)</SelectItem>
                          {salesHeaders.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Data da Venda</label>
                      <Select 
                        value={salesMapping.sale_date || "__none__"} 
                        onValueChange={(v) => setSalesMapping(m => ({ ...m, sale_date: v === "__none__" ? "" : v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Usar data de hoje</SelectItem>
                          {salesHeaders.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      {salesCsvData.length} vendas encontradas
                    </p>
                    <Button onClick={handleImportSales} disabled={salesProcessing || !selectedSeller}>
                      {salesProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Importar Vendas
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Installments Update Tab */}
        <TabsContent value="installments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Atualizar Parcelas via CSV
              </CardTitle>
              <CardDescription>
                Atualize o status de parcelas existentes importando dados de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={platform} onValueChange={(v: "hotmart" | "asaas") => setPlatform(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotmart">Hotmart</SelectItem>
                    <SelectItem value="asaas">Asaas</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="max-w-md"
                />
              </div>
              
              {headers.length > 0 && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium">Mapeamento de Colunas</h4>
                  <p className="text-sm text-muted-foreground">
                    Selecione qual coluna do CSV corresponde a cada campo
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">ID da Venda *</label>
                      <Select 
                        value={mapping.external_id || ""} 
                        onValueChange={(v) => setMapping(m => ({ ...m, external_id: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((header, index) => (
                            <SelectItem key={index} value={String(index)}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Nº Parcela *</label>
                      <Select 
                        value={mapping.installment_number || ""} 
                        onValueChange={(v) => setMapping(m => ({ ...m, installment_number: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((header, index) => (
                            <SelectItem key={index} value={String(index)}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Valor *</label>
                      <Select 
                        value={mapping.value || ""} 
                        onValueChange={(v) => setMapping(m => ({ ...m, value: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((header, index) => (
                            <SelectItem key={index} value={String(index)}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Status *</label>
                      <Select 
                        value={mapping.status || ""} 
                        onValueChange={(v) => setMapping(m => ({ ...m, status: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((header, index) => (
                            <SelectItem key={index} value={String(index)}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Data Pagamento</label>
                      <Select 
                        value={mapping.payment_date || "__none__"} 
                        onValueChange={(v) => setMapping(m => ({ ...m, payment_date: v === "__none__" ? "" : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Não importar</SelectItem>
                          {headers.map((header, index) => (
                            <SelectItem key={index} value={String(index)}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      {csvData.length} registros encontrados
                    </p>
                    <Button onClick={handleImportInstallments} disabled={processing}>
                      {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Atualizar Parcelas
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Histórico de Importações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Processados</TableHead>
                  <TableHead>Criados</TableHead>
                  <TableHead>Atualizados</TableHead>
                  <TableHead>Falhas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : imports?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma importação realizada
                    </TableCell>
                  </TableRow>
                ) : (
                  imports?.map((imp: any) => (
                    <TableRow key={imp.id}>
                      <TableCell>
                        {format(new Date(imp.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[150px] truncate">
                        {imp.filename}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {imp.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>{imp.records_processed}</TableCell>
                      <TableCell>{imp.records_created}</TableCell>
                      <TableCell>{imp.records_updated}</TableCell>
                      <TableCell className="text-destructive">{imp.records_failed}</TableCell>
                      <TableCell>
                        {imp.records_failed === 0 ? (
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sucesso
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Parcial
                          </Badge>
                        )}
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
