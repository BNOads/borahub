import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Trash2, Eye, Copy, Check, Database } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCopyBank, useDeleteCopy, CopyBankItem } from "@/hooks/useCopyBank";
import { useActiveFunnels } from "@/hooks/useFunnels";
import { toast } from "sonner";

const CHANNEL_LABELS: Record<string, string> = {
  email: "E-mail",
  whatsapp_grupos: "WhatsApp Grupos",
  whatsapp_1x1: "WhatsApp 1x1",
  sms: "SMS",
  audio: "Áudio",
  conteudo: "Conteúdo",
};

const STAGE_LABELS: Record<string, string> = {
  aquecimento: "Aquecimento",
  captacao: "Captação",
  cpl_conteudo: "CPL/Conteúdo",
  evento_aula: "Evento/Aula",
  abertura_carrinho: "Abertura",
  carrinho_aberto: "Carrinho",
  fechamento: "Fechamento",
  pos_venda: "Pós-venda",
};

export function CopyBankList() {
  const [search, setSearch] = useState("");
  const [funnelFilter, setFunnelFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewCopy, setViewCopy] = useState<CopyBankItem | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: funnels = [] } = useActiveFunnels();
  const { data: copies = [], isLoading } = useCopyBank({
    search: search || undefined,
    funnelId: funnelFilter !== "all" ? funnelFilter : undefined,
    channel: channelFilter !== "all" ? channelFilter : undefined,
  });
  const deleteCopy = useDeleteCopy();

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copy copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteCopy.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Database className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-bold">Banco de Copies</h3>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Select value={funnelFilter} onValueChange={setFunnelFilter}>
          <SelectTrigger className="w-full md:w-[200px] rounded-xl">
            <SelectValue placeholder="Filtrar por funil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os funis</SelectItem>
            {funnels.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-full md:w-[180px] rounded-xl">
            <SelectValue placeholder="Filtrar por canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Funil</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : copies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma copy encontrada
                  </TableCell>
                </TableRow>
              ) : (
                copies.map((copy) => (
                  <TableRow key={copy.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {copy.name}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {copy.funnel_name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {CHANNEL_LABELS[copy.channel] || copy.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {STAGE_LABELS[copy.funnel_stage || ""] || copy.funnel_stage || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(copy.created_at), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewCopy(copy)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopy(copy.content)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(copy.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir copy?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A copy será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Dialog */}
      <Dialog open={!!viewCopy} onOpenChange={() => setViewCopy(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewCopy?.name}</DialogTitle>
          </DialogHeader>
          {viewCopy && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {CHANNEL_LABELS[viewCopy.channel] || viewCopy.channel}
                </Badge>
                {viewCopy.funnel_stage && (
                  <Badge variant="outline">
                    {STAGE_LABELS[viewCopy.funnel_stage] || viewCopy.funnel_stage}
                  </Badge>
                )}
                {viewCopy.funnel_name && (
                  <Badge variant="outline">{viewCopy.funnel_name}</Badge>
                )}
              </div>
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                  {viewCopy.content}
                </pre>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Por: {viewCopy.author_name}</span>
                <span>{format(new Date(viewCopy.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => handleCopy(viewCopy.content)}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar Copy
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
