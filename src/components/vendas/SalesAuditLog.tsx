import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditEntry {
  id: string;
  sale_id: string;
  operation: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_at: string;
  changed_by: string | null;
}

export function SalesAuditLog() {
  const [search, setSearch] = useState("");
  const [operationFilter, setOperationFilter] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["sales-audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_audit_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as AuditEntry[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name");
      if (error) throw error;
      return data;
    },
  });

  const profileMap = new Map(profiles.map((p) => [p.id, p.full_name]));

  const getClientName = (entry: AuditEntry) => {
    const data = entry.new_data || entry.old_data;
    return data?.client_name || data?.external_id || entry.sale_id;
  };

  const getSellerName = (entry: AuditEntry) => {
    const data = entry.new_data || entry.old_data;
    if (data?.seller_id) return profileMap.get(data.seller_id) || "—";
    return "—";
  };

  const getChangedFields = (entry: AuditEntry): string[] => {
    if (entry.operation !== "UPDATE" || !entry.old_data || !entry.new_data) return [];
    const changes: string[] = [];
    for (const key of Object.keys(entry.new_data)) {
      if (JSON.stringify(entry.old_data[key]) !== JSON.stringify(entry.new_data[key])) {
        changes.push(key);
      }
    }
    return changes;
  };

  const filtered = logs.filter((log) => {
    if (operationFilter !== "all" && log.operation !== operationFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      const client = getClientName(log).toLowerCase();
      const seller = getSellerName(log).toLowerCase();
      const saleId = log.sale_id.toLowerCase();
      return client.includes(term) || seller.includes(term) || saleId.includes(term);
    }
    return true;
  });

  const opBadge = (op: string) => {
    switch (op) {
      case "INSERT": return <Badge className="bg-green-600 text-white">Criação</Badge>;
      case "UPDATE": return <Badge className="bg-blue-600 text-white">Alteração</Badge>;
      case "DELETE": return <Badge variant="destructive">Exclusão</Badge>;
      default: return <Badge>{op}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Histórico de Alterações em Vendas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, vendedor ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={operationFilter} onValueChange={setOperationFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Operação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="INSERT">Criações</SelectItem>
              <SelectItem value="UPDATE">Alterações</SelectItem>
              <SelectItem value="DELETE">Exclusões</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum registro encontrado.</p>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Alterado por</TableHead>
                  <TableHead>Campos alterados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => {
                  const changes = getChangedFields(log);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(log.changed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{opBadge(log.operation)}</TableCell>
                      <TableCell className="text-sm">{getClientName(log)}</TableCell>
                      <TableCell className="text-sm">{getSellerName(log)}</TableCell>
                      <TableCell className="text-sm">
                        {log.changed_by ? profileMap.get(log.changed_by) || "Sistema" : "Sistema"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.operation === "DELETE" ? (
                          <span className="text-destructive">Registro excluído</span>
                        ) : changes.length > 0 ? (
                          changes.join(", ")
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
