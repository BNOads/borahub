import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCloseTicket, useUploadTicketAnexo } from "@/hooks/useTickets";
import { Paperclip, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticketId: string;
  linkedTaskId: string | null;
  createdAt: string;
}

export function TicketCloseModal({ open, onOpenChange, ticketId, linkedTaskId, createdAt }: Props) {
  const [solucao, setSolucao] = useState("");
  const [anexoAdded, setAnexoAdded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const closeTicket = useCloseTicket();
  const uploadAnexo = useUploadTicketAnexo();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAnexo.mutateAsync({ ticketId, file });
      setAnexoAdded(true);
      toast.success("Anexo adicionado!");
    } catch {
      toast.error("Erro ao anexar arquivo");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const canClose = solucao.trim().length > 0 && anexoAdded;

  const handleClose = async () => {
    if (!canClose) return;
    try {
      await closeTicket.mutateAsync({ ticketId, solucaoDescricao: solucao.trim(), linkedTaskId, createdAt });
      toast.success("Ticket encerrado!");
      onOpenChange(false);
      setSolucao("");
      setAnexoAdded(false);
    } catch {
      toast.error("Erro ao encerrar ticket");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Encerrar Ticket</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Descrição da solução *</Label>
            <Textarea value={solucao} onChange={(e) => setSolucao(e.target.value)} rows={4} placeholder="Descreva como o problema foi resolvido..." />
          </div>
          <div className="space-y-1.5">
            <Label>Anexo obrigatório *</Label>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadAnexo.isPending}>
                <Paperclip className="h-4 w-4 mr-1" /> {anexoAdded ? "Anexo enviado ✓" : "Anexar arquivo"}
              </Button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
            </div>
            {!anexoAdded && <p className="text-xs text-muted-foreground">É obrigatório anexar um arquivo para encerrar.</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleClose} disabled={!canClose || closeTicket.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Encerrar Ticket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
