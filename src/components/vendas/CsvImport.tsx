import { useState, useRef } from "react";
import { useCreateCsvImport, useCsvImports } from "@/hooks/useSales";
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
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface CsvRecord {
  external_id: string;
  installment_number: number;
  value: number;
  status: string;
  payment_date?: string;
}

export function CsvImport() {
  const { data: imports, isLoading: importsLoading } = useCsvImports();
  const createImport = useCreateCsvImport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [platform, setPlatform] = useState<"hotmart" | "asaas">("hotmart");
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  
  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const parsed = lines.map(line => {
        // Handle quoted values with commas
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });
      
      if (parsed.length > 0) {
        setHeaders(parsed[0]);
        setCsvData(parsed.slice(1));
        
        // Auto-map common column names
        const autoMapping: Record<string, string> = {};
        parsed[0].forEach((header, index) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('id') && !autoMapping.external_id) {
            autoMapping.external_id = String(index);
          }
          if (lowerHeader.includes('parcela') || lowerHeader.includes('installment')) {
            autoMapping.installment_number = String(index);
          }
          if (lowerHeader.includes('valor') || lowerHeader.includes('value') || lowerHeader.includes('amount')) {
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
    };
    reader.readAsText(file);
  }
  
  async function handleImport() {
    if (!mapping.external_id || !mapping.installment_number || !mapping.value || !mapping.status) {
      toast.error("Por favor, mapeie todos os campos obrigatórios");
      return;
    }
    
    setProcessing(true);
    
    try {
      const records: CsvRecord[] = csvData.map(row => ({
        external_id: row[parseInt(mapping.external_id)] || '',
        installment_number: parseInt(row[parseInt(mapping.installment_number)]) || 1,
        value: parseFloat(row[parseInt(mapping.value)]?.replace(',', '.')) || 0,
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
  
  return (
    <div className="space-y-6">
      {/* Import Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar CSV
          </CardTitle>
          <CardDescription>
            Importe dados de pagamento da Hotmart ou Asaas para atualizar parcelas
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
                <Button onClick={handleImport} disabled={processing}>
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Importar Dados
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
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
                      Carregando...
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
                      <TableCell className="font-mono text-xs">
                        {imp.filename}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {imp.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>{imp.records_processed}</TableCell>
                      <TableCell className="text-success">{imp.records_created}</TableCell>
                      <TableCell className="text-accent">{imp.records_updated}</TableCell>
                      <TableCell className="text-destructive">{imp.records_failed}</TableCell>
                      <TableCell>
                        {imp.records_failed === 0 ? (
                          <Badge variant="outline" className="bg-success/10 text-success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sucesso
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-warning/10 text-warning">
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
