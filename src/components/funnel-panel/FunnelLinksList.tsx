import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Link2,
  Plus,
  Copy,
  ExternalLink,
  Edit,
  Trash2,
  Check,
  AlertCircle,
} from "lucide-react";
import { FunnelLink } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FunnelLinksListProps {
  funnelId: string;
}

const LINK_TYPES = [
  { value: "captura", label: "Página de Captura" },
  { value: "vendas", label: "Página de Vendas / Checkout" },
  { value: "leads", label: "Planilha de Leads" },
  { value: "compradores", label: "Planilha de Compradores" },
  { value: "drive", label: "Pasta do Drive do Lançamento" },
  { value: "pesquisa", label: "Formulário de Pesquisa / NPS" },
  { value: "criativos", label: "Biblioteca de Criativos" },
  { value: "memorial", label: "Memorial" },
  { value: "custom", label: "Personalizado" },
];

export function FunnelLinksList({ funnelId }: FunnelLinksListProps) {
  const [links, setLinks] = useState<FunnelLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<FunnelLink | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    link_type: "custom",
    url: "",
  });

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("funnel_links")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [funnelId]);

  const openModal = (link?: FunnelLink) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        name: link.name,
        link_type: link.link_type,
        url: link.url || "",
      });
    } else {
      setEditingLink(null);
      setFormData({ name: "", link_type: "custom", url: "" });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      if (editingLink) {
        const { error } = await supabase
          .from("funnel_links")
          .update(formData)
          .eq("id", editingLink.id);
        if (error) throw error;
        toast.success("Link atualizado!");
      } else {
        const { error } = await supabase
          .from("funnel_links")
          .insert({ ...formData, funnel_id: funnelId });
        if (error) throw error;
        toast.success("Link adicionado!");
      }
      setModalOpen(false);
      fetchLinks();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este link?")) return;
    try {
      const { error } = await supabase.from("funnel_links").delete().eq("id", id);
      if (error) throw error;
      toast.success("Link excluído!");
      fetchLinks();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const getLinkTypeLabel = (type: string) => {
    return LINK_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4 text-accent" />
              Links do Funil
            </CardTitle>
            <Button size="sm" onClick={() => openModal()} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum link cadastrado</p>
              <p className="text-xs mt-1">Adicione os links operacionais do funil</p>
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-1.5 rounded-full",
                        link.url ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                      )}
                    >
                      {link.url ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{link.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getLinkTypeLabel(link.link_type)}
                        {!link.url && " • Pendente"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {link.url && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyLink(link.url!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(link.url!, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openModal(link)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(link.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? "Editar Link" : "Novo Link"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Página de Captura Principal"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.link_type}
                onValueChange={(value) => setFormData({ ...formData, link_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
