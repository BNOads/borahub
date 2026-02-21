import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCreateTicket } from "@/hooks/useTickets";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Mail, Phone, MessageSquare } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ORIGENS = [
  { value: "WhatsApp", icon: "💬" },
  { value: "Email", icon: "📧" },
  { value: "Telefone", icon: "📞" },
  { value: "Site", icon: "🌐" },
  { value: "Chat", icon: "💭" },
  { value: "Outro", icon: "📋" },
];

const CATEGORIAS = [
  { value: "Financeiro", icon: "💰" },
  { value: "Técnico", icon: "🔧" },
  { value: "Comercial", icon: "📊" },
  { value: "Suporte", icon: "🎧" },
  { value: "Outro", icon: "📌" },
];

const PRIORIDADES = [
  { value: "critica", label: "Crítica", sla: "2h", color: "bg-destructive/10 text-destructive" },
  { value: "alta", label: "Alta", sla: "8h", color: "bg-orange-500/10 text-orange-600" },
  { value: "media", label: "Média", sla: "24h", color: "bg-amber-500/10 text-amber-600" },
  { value: "baixa", label: "Baixa", sla: "48h", color: "bg-muted text-muted-foreground" },
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
        .select("id, full_name, display_name, avatar_url")
        .eq("is_active", true)
        .order("full_name");
      return data || [];
    },
    enabled: open,
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
  const selectedPrio = PRIORIDADES.find((p) => p.value === form.prioridade);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Novo Ticket de Suporte
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente e da solicitação. Uma tarefa será criada automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Client info section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados do Cliente</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5" /> Nome *
                </Label>
                <Input placeholder="Nome completo" value={form.cliente_nome} onChange={(e) => update("cliente_nome", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Mail className="h-3.5 w-3.5" /> Email *
                </Label>
                <Input type="email" placeholder="email@exemplo.com" value={form.cliente_email} onChange={(e) => update("cliente_email", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5" /> WhatsApp *
                </Label>
                <Input placeholder="(11) 99999-9999" value={form.cliente_whatsapp} onChange={(e) => update("cliente_whatsapp", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Ticket info section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalhes do Ticket</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Origem *</Label>
                <Select value={form.origem} onValueChange={(v) => update("origem", v)}>
                  <SelectTrigger><SelectValue placeholder="De onde veio?" /></SelectTrigger>
                  <SelectContent>
                    {ORIGENS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">{o.icon} {o.value}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Categoria *</Label>
                <Select value={form.categoria} onValueChange={(v) => update("categoria", v)}>
                  <SelectTrigger><SelectValue placeholder="Tipo do problema" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">{c.icon} {c.value}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Prioridade *</Label>
                <Select value={form.prioridade} onValueChange={(v) => update("prioridade", v)}>
                  <SelectTrigger><SelectValue placeholder="Urgência" /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] px-1.5 ${p.color}`}>{p.label}</Badge>
                          <span className="text-xs text-muted-foreground">SLA {p.sla}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPrio && (
                  <p className="text-xs text-muted-foreground">
                    O ticket deverá ser resolvido em até <strong>{selectedPrio.sla}</strong>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Responsável *</Label>
                <Select value={form.responsavel_id} onValueChange={(v) => update("responsavel_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Atribuir a..." /></SelectTrigger>
                  <SelectContent>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <img
                            src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&size=24&background=random`}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover shrink-0"
                          />
                          {u.display_name || u.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm">Descrição do problema *</Label>
            <Textarea
              value={form.descricao}
              onChange={(e) => update("descricao", e.target.value)}
              rows={4}
              placeholder="Descreva a situação do cliente com o máximo de detalhes possível..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createTicket.isPending} className="gap-2">
              {createTicket.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Criando...</>
              ) : (
                "Criar Ticket"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
