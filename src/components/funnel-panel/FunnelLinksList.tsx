import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Link2,
  Copy,
  ExternalLink,
  Check,
  Save,
  FileSpreadsheet,
  Globe,
  ShoppingCart,
  FolderOpen,
  FileQuestion,
  Images,
  FileText,
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

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("funnel_links")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setLinks(data || []);

      // Inicializa os valores de edição
      const urls: Record<string, string> = {};
      data?.forEach(link => {
        urls[link.id] = link.url || "";
      });
      setEditingUrls(urls);
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
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
      fetchLinks();
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

  const filledCount = links.filter(l => l.url).length;
  const totalCount = LINK_CATEGORIES.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4 text-accent" />
            Links do Funil
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {filledCount}/{totalCount} preenchidos
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {LINK_CATEGORIES.map((category) => {
              const link = getLinkByType(category.type);
              const Icon = category.icon;
              const hasUrl = link?.url;
              const currentUrl = link ? (editingUrls[link.id] || "") : "";
              const urlChanged = link && currentUrl !== (link.url || "");

              return (
                <div
                  key={category.type}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    hasUrl
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-muted/30 border-dashed border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={cn(
                        "p-1.5 rounded-lg",
                        hasUrl
                          ? "bg-green-500/10 text-green-600"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{category.label}</p>
                    </div>
                    {hasUrl && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {link && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={currentUrl}
                        onChange={(e) => handleUrlChange(link.id, e.target.value)}
                        placeholder="Cole o link aqui..."
                        className="h-9 text-sm"
                      />
                      {urlChanged && (
                        <Button
                          size="sm"
                          onClick={() => handleSaveUrl(link.id)}
                          disabled={savingId === link.id}
                          className="h-9 px-3"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      )}
                      {hasUrl && !urlChanged && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => copyLink(link.url!)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => window.open(link.url!, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
