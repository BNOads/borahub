import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTransferTicket } from "@/hooks/useTickets";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticketId: string;
  currentResponsavelId: string;
  linkedTaskId: string | null;
}

export function TicketTransferModal({ open, onOpenChange, ticketId, currentResponsavelId, linkedTaskId }: Props) {
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [motivo, setMotivo] = useState("");
  const transfer = useTransferTicket();

  const { data: users } = useQuery({
    queryKey: ["profiles-active"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, display_name").eq("is_active", true).order("full_name");
      return data || [];
    },
  });

  const handleSubmit = async () => {
    if (!novoResponsavel || !motivo.trim()) {
      toast.error("Preencha o responsável e o motivo");
      return;
    }
    try {
      await transfer.mutateAsync({ ticketId, novoResponsavelId: novoResponsavel, motivo: motivo.trim(), linkedTaskId });
      toast.success("Ticket transferido!");
      onOpenChange(false);
      setMotivo("");
      setNovoResponsavel("");
    } catch {
      toast.error("Erro ao transferir");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Transferir Responsável</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Novo responsável *</Label>
            <Select value={novoResponsavel} onValueChange={setNovoResponsavel}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {users?.filter((u) => u.id !== currentResponsavelId).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.display_name || u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Motivo da transferência *</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Descreva o motivo..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={transfer.isPending}>Transferir</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
