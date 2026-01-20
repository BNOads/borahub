import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, CheckCircle, AlertTriangle, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SyncLog {
  id: string;
  sync_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  total_records: number;
  created_records: number;
  updated_records: number;
  failed_records: number;
  error_message: string | null;
}

function useSyncLogs() {
  return useQuery({
    queryKey: ["hotmart-sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotmart_sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as SyncLog[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "success":
      return (
        <Badge variant="default" className="bg-success text-success-foreground">
          <CheckCircle className="h-3 w-3 mr-1" />
          Sucesso
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="secondary" className="bg-warning text-warning-foreground">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Parcial
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Erro
        </Badge>
      );
    case "running":
      return (
        <Badge variant="outline">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Executando
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getSyncTypeBadge(type: string) {
  switch (type) {
    case "scheduled":
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          Agendado
        </Badge>
      );
    case "manual":
      return <Badge variant="secondary">Manual</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export function SyncLogs() {
  const { data: logs, isLoading, refetch, isRefetching } = useSyncLogs();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Sincronizações
            </CardTitle>
            <CardDescription>
              Sincronização automática a cada 15 minutos
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Criados</TableHead>
                  <TableHead className="text-center">Atualizados</TableHead>
                  <TableHead className="text-center">Falhas</TableHead>
                  <TableHead>Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {format(new Date(log.started_at), "dd/MM/yyyy HH:mm")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.started_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getSyncTypeBadge(log.sync_type)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(log.status)}
                        {log.error_message && (
                          <div className="text-xs text-destructive max-w-[200px] truncate" title={log.error_message}>
                            {log.error_message}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{log.total_records}</TableCell>
                    <TableCell className="text-center text-success">{log.created_records}</TableCell>
                    <TableCell className="text-center text-accent">{log.updated_records}</TableCell>
                    <TableCell className="text-center text-destructive">{log.failed_records}</TableCell>
                    <TableCell>
                      {log.completed_at ? (
                        <span className="text-sm text-muted-foreground">
                          {Math.round(
                            (new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000
                          )}s
                        </span>
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma sincronização registrada ainda. A primeira sincronização automática ocorrerá em breve.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
