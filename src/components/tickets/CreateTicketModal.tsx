import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTicket } from "@/hooks/useTickets";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ORIGENS = ["WhatsApp", "Email", "Telefone", "Site", "Chat", "Outro"];
const CATEGORIAS = ["Financeiro", "Técnico", "Comercial", "Suporte", "Outro"];
const PRIORIDADES = [
  { value: "critica", label: "Crítica (SLA 2h)" },
  { value: "alta", label: "Alta (SLA 8h)" },
  { value: "media", label: "Média (SLA 24h)" },
  { value: "baixa", label: "Baixa (SLA 48h)" },
];

export function CreateTicketModal({ open, onOpenChange }: Props) {
  const [form, setForm] = useState({
    cliente_nome: "",
    cliente_email: "",
    cliente_whatsapp: "",
    origem: "",
    categoria: "",
    descricao: "",
    prioridade: "",
    responsavel_id: "",
  });

  const createTicket = useCreateTicket();

  const { data: users } = useQuery({
    queryKey: ["profiles-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, display_name")
        .eq("is_active", true)
        .order("full_name");
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_nome || !form.cliente_email || !form.cliente_whatsapp || !form.origem || !form.categoria || !form.descricao || !form.prioridade || !form.responsavel_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      await createTicket.mutateAsync(form);
      toast.success("Ticket criado com sucesso!");
      onOpenChange(false);
      setForm({ cliente_nome: "", cliente_email: "", cliente_whatsapp: "", origem: "", categoria: "", descricao: "", prioridade: "", responsavel_id: "" });
    } catch {
      toast.error("Erro ao criar ticket");
    }
  };

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do cliente *</Label>
              <Input value={form.cliente_nome} onChange={(e) => update("cliente_nome", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.cliente_email} onChange={(e) => update("cliente_email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp *</Label>
              <Input value={form.cliente_whatsapp} onChange={(e) => update("cliente_whatsapp", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Origem *</Label>
              <Select value={form.origem} onValueChange={(v) => update("origem", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={form.categoria} onValueChange={(v) => update("categoria", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade *</Label>
              <Select value={form.prioridade} onValueChange={(v) => update("prioridade", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Responsável *</Label>
            <Select value={form.responsavel_id} onValueChange={(v) => update("responsavel_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar responsável" /></SelectTrigger>
              <SelectContent>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.display_name || u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição *</Label>
            <Textarea value={form.descricao} onChange={(e) => update("descricao", e.target.value)} rows={4} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? "Criando..." : "Criar Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
