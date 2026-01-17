import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Link2,
  Copy,
  ExternalLink,
  Plus,
  Save,
  FileSpreadsheet,
  Globe,
  ShoppingCart,
  FolderOpen,
  FileQuestion,
  Images,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import { FunnelLink } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FunnelLinksListProps {
  funnelId: string;
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

export function FunnelLinksList({ funnelId }: FunnelLinksListProps) {
  const [links, setLinks] = useState<FunnelLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUrls, setEditingUrls] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const handleSaveUrl = async (linkId: string) => {
    setSavingId(linkId);
    try {
      const { error } = await supabase
        .from("funnel_links")
        .update({ url: editingUrls[linkId] })
        .eq("id", linkId);

      if (error) throw error;
      toast.success("Link salvo!");

      setLinks(prev => prev.map(l =>
        l.id === linkId ? { ...l, url: editingUrls[linkId] } : l
      ));
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setSavingId(null);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="rounded-2xl border bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Links Úteis do Lançamento</span>
        </div>
        <Button size="sm" className="gap-1.5 bg-emerald-500 hover:bg-emerald-600">
          <Plus className="h-3.5 w-3.5" />
          Link Personalizado
        </Button>
      </div>

      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          LINK_CATEGORIES.map((category) => {
            const link = getLinkByType(category.type);
            const hasUrl = link?.url;
            const currentUrl = link ? (editingUrls[link.id] || "") : "";
            const urlChanged = link && currentUrl !== (link.url || "");

            return (
              <div
                key={category.type}
                className={cn(
                  "p-3 rounded-xl border transition-all",
                  hasUrl ? "bg-background" : "bg-amber-50/50 dark:bg-amber-900/10 border-dashed border-amber-300 dark:border-amber-700"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{category.label}</span>
                    {hasUrl ? (
                      <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                        OK
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                        Pendente
                      </Badge>
                    )}
                  </div>
                  {!hasUrl && (
                    <Button size="sm" variant="default" className="h-7 gap-1 bg-emerald-500 hover:bg-emerald-600">
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  )}
                </div>

                {link && (
                  <div className="flex items-center gap-2">
                    {hasUrl ? (
                      <>
                        <Input
                          value={currentUrl}
                          onChange={(e) => handleUrlChange(link.id, e.target.value)}
                          className="h-8 text-xs bg-muted/50 border-0"
                          readOnly={!urlChanged}
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyLink(link.url!)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => window.open(link.url!, "_blank")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Input
                        value={currentUrl}
                        onChange={(e) => handleUrlChange(link.id, e.target.value)}
                        placeholder="Cole a URL aqui..."
                        className="h-8 text-xs"
                        onBlur={() => urlChanged && handleSaveUrl(link.id)}
                        onKeyDown={(e) => e.key === "Enter" && urlChanged && handleSaveUrl(link.id)}
                      />
                    )}
                    {urlChanged && (
                      <Button
                        size="sm"
                        onClick={() => handleSaveUrl(link.id)}
                        disabled={savingId === link.id}
                        className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
