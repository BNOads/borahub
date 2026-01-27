import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Link2,
  Copy,
  ExternalLink,
  Plus,
  GripVertical,
  FileSpreadsheet,
  Globe,
  ShoppingCart,
  FolderOpen,
  FileQuestion,
  Images,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { FunnelLink } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FunnelLinksListProps {
  funnelId: string;
  compact?: boolean;
}

const LINK_CATEGORIES = [
  { type: "captura", label: "Página de Captura", icon: Globe },
  { type: "vendas", label: "Página de Vendas / Checkout", icon: ShoppingCart },
  { type: "leads", label: "Planilha de Leads", icon: FileSpreadsheet },
  { type: "compradores", label: "Planilha de Compradores", icon: FileSpreadsheet },
  { type: "drive", label: "Pasta do Drive do Lançamento", icon: FolderOpen },
  { type: "pesquisa", label: "Formulário de Pesquisa / NPS", icon: FileQuestion },
  { type: "criativos", label: "Biblioteca de Criativos", icon: Images },
  { type: "memorial", label: "Memorial", icon: FileText },
];

export function FunnelLinksList({ funnelId, compact = false }: FunnelLinksListProps) {
  const [links, setLinks] = useState<FunnelLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUrls, setEditingUrls] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [customLinkOpen, setCustomLinkOpen] = useState(false);
  const [customLinkName, setCustomLinkName] = useState("");
  const [customLinkUrl, setCustomLinkUrl] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  const ensureLinksExist = async () => {
    try {
      const { data: existingLinks, error: fetchError } = await supabase
        .from("funnel_links")
        .select("*")
        .eq("funnel_id", funnelId);

      if (fetchError) throw fetchError;

      const existingTypes = new Set(existingLinks?.map(l => l.link_type) || []);
      const missingCategories = LINK_CATEGORIES.filter(cat => !existingTypes.has(cat.type));

      if (missingCategories.length > 0) {
        const linksToCreate = missingCategories.map(cat => ({
          funnel_id: funnelId,
          name: cat.label,
          link_type: cat.type,
        }));

        const { error: insertError } = await supabase
          .from("funnel_links")
          .insert(linksToCreate);

        if (insertError) throw insertError;
      }

      const { data: allLinks, error: refetchError } = await supabase
        .from("funnel_links")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("created_at", { ascending: true });

      if (refetchError) throw refetchError;
      setLinks(allLinks || []);

      const urls: Record<string, string> = {};
      allLinks?.forEach(link => {
        urls[link.id] = link.url || "";
      });
      setEditingUrls(urls);
    } catch (error) {
      console.error("Error ensuring links exist:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ensureLinksExist();
  }, [funnelId]);

  const getLinkByType = (type: string) => {
    return links.find(l => l.link_type === type);
  };

  const handleUrlChange = (linkId: string, url: string) => {
    setEditingUrls(prev => ({ ...prev, [linkId]: url }));
  };

  const handleAddUrl = async (linkId: string) => {
    const url = editingUrls[linkId];
    if (!url?.trim()) {
      toast.error("Digite uma URL válida");
      return;
    }
    
    setSavingId(linkId);
    try {
      const { error } = await supabase
        .from("funnel_links")
        .update({ url: url.trim() })
        .eq("id", linkId);

      if (error) throw error;
      toast.success("Link adicionado!");

      setLinks(prev => prev.map(l =>
        l.id === linkId ? { ...l, url: url.trim() } : l
      ));
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleAddCustomLink = async () => {
    if (!customLinkName.trim()) {
      toast.error("Digite um nome para o link");
      return;
    }
    
    setAddingCustom(true);
    try {
      const { data, error } = await supabase
        .from("funnel_links")
        .insert({
          funnel_id: funnelId,
          name: customLinkName.trim(),
          link_type: "custom",
          url: customLinkUrl.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      setLinks(prev => [...prev, data]);
      setEditingUrls(prev => ({ ...prev, [data.id]: data.url || "" }));
      setCustomLinkName("");
      setCustomLinkUrl("");
      setCustomLinkOpen(false);
      toast.success("Link personalizado adicionado!");
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setAddingCustom(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("funnel_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;
      
      setLinks(prev => prev.filter(l => l.id !== linkId));
      toast.success("Link removido!");
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const filledCount = links.filter(l => l.url).length;
  const totalCount = links.length;

  // Get custom links
  const customLinks = links.filter(l => l.link_type === "custom");

  // Compact mode for overview
  if (compact) {
    return (
      <div className="rounded-2xl border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-accent" />
            <span className="font-semibold">Links Úteis</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              {filledCount}/{totalCount}
            </Badge>
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))
          ) : (
            LINK_CATEGORIES.map((category) => {
              const link = getLinkByType(category.type);
              const hasUrl = !!link?.url;
              const IconComponent = category.icon;

              return (
                <button
                  key={category.type}
                  onClick={() => hasUrl && link?.url && window.open(link.url, "_blank")}
                  disabled={!hasUrl}
                  className={cn(
                    "p-3 rounded-xl border transition-all text-left group",
                    hasUrl
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:shadow-md cursor-pointer"
                      : "bg-amber-50/50 dark:bg-amber-900/10 border-dashed border-amber-300 dark:border-amber-700 cursor-not-allowed opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <IconComponent className={cn(
                      "h-4 w-4",
                      hasUrl ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
                    )} />
                    {hasUrl ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                  <p className="text-xs font-medium truncate">{category.label}</p>
                  {hasUrl && (
                    <ExternalLink className="h-3 w-3 text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Full mode for Links tab - NEW LAYOUT matching reference
  return (
    <div className="rounded-2xl border bg-amber-50/30 dark:bg-amber-900/5">
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold">Links Úteis do Lançamento</h2>
        </div>
        <Dialog open={customLinkOpen} onOpenChange={setCustomLinkOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 bg-background">
              <Plus className="h-4 w-4" />
              Link Personalizado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Link Personalizado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome do Link</Label>
                <Input
                  value={customLinkName}
                  onChange={(e) => setCustomLinkName(e.target.value)}
                  placeholder="Ex: Dashboard de Métricas"
                />
              </div>
              <div className="space-y-2">
                <Label>URL (opcional)</Label>
                <Input
                  value={customLinkUrl}
                  onChange={(e) => setCustomLinkUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <Button 
                onClick={handleAddCustomLink} 
                disabled={addingCustom || !customLinkName.trim()}
                className="w-full"
              >
                {addingCustom ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-5 pb-5 space-y-3 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Standard Links */}
            {LINK_CATEGORIES.map((category) => {
              const link = getLinkByType(category.type);
              const hasUrl = link?.url;
              const currentUrl = link ? (editingUrls[link.id] || "") : "";

              return (
                <div
                  key={category.type}
                  className="p-4 rounded-xl border bg-background transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center pt-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{category.label}</span>
                        {hasUrl ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] px-2 py-0.5 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Configurado
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] px-2 py-0.5 gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Pendente
                          </Badge>
                        )}
                      </div>
                      
                      {link && (
                        <div className="flex items-center gap-2">
                          <Input
                            value={currentUrl}
                            onChange={(e) => handleUrlChange(link.id, e.target.value)}
                            placeholder="Cole a URL aqui..."
                            className="h-9 text-sm bg-muted/50 border-muted"
                          />
                          {hasUrl ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => copyLink(link.url!)}
                                title="Copiar link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => window.open(link.url!, "_blank")}
                                title="Abrir link"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleAddUrl(link.id)}
                              disabled={savingId === link.id || !currentUrl.trim()}
                              className="h-9 px-4 bg-primary hover:bg-primary/90 gap-2"
                            >
                              {savingId === link.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                              Add
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Custom Links */}
            {customLinks.map((link) => {
              const hasUrl = link.url;
              const currentUrl = editingUrls[link.id] || "";

              return (
                <div
                  key={link.id}
                  className="p-4 rounded-xl border bg-background transition-all border-primary/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center pt-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{link.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                            Personalizado
                          </Badge>
                          {hasUrl ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] px-2 py-0.5 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Configurado
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] px-2 py-0.5 gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Pendente
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteLink(link.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          value={currentUrl}
                          onChange={(e) => handleUrlChange(link.id, e.target.value)}
                          placeholder="Cole a URL aqui..."
                          className="h-9 text-sm bg-muted/50 border-muted"
                        />
                        {hasUrl ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => copyLink(link.url!)}
                              title="Copiar link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => window.open(link.url!, "_blank")}
                              title="Abrir link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleAddUrl(link.id)}
                            disabled={savingId === link.id || !currentUrl.trim()}
                            className="h-9 px-4 bg-primary hover:bg-primary/90 gap-2"
                          >
                            {savingId === link.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
