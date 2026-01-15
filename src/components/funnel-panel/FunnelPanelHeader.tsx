import { ArrowLeft, Copy, Globe, Lock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { FunnelData, formatCurrency } from "./types";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface FunnelPanelHeaderProps {
  funnel: FunnelData;
  onUpdate: () => void;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  finished: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  archived: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  finished: "Finalizado",
  archived: "Arquivado",
};

export function FunnelPanelHeader({ funnel, onUpdate }: FunnelPanelHeaderProps) {
  const navigate = useNavigate();

  const copyLink = () => {
    const url = `${window.location.origin}/funis/${funnel.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const shareLink = async () => {
    const url = `${window.location.origin}/funis/${funnel.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: funnel.name, url });
      } catch {
        // cancelled
      }
    } else {
      copyLink();
    }
  };

  const toggleVisibility = async () => {
    const newVisibility = funnel.visibility === "public" ? "private" : "public";
    try {
      const { error } = await supabase
        .from("funnels")
        .update({ visibility: newVisibility })
        .eq("id", funnel.id);

      if (error) throw error;
      toast.success(`Funil agora é ${newVisibility === "public" ? "público" : "privado"}`);
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao alterar visibilidade: " + error.message);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/funis")} className="mt-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{funnel.name}</h1>
              {funnel.product_name && (
                <p className="text-sm text-muted-foreground mt-0.5">{funnel.product_name}</p>
              )}
            </div>
            {funnel.code && (
              <Badge variant="outline" className="text-xs">
                {funnel.code}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={statusColors[funnel.status || "active"]}
            >
              {statusLabels[funnel.status || "active"]}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            {funnel.category && <span>{funnel.category}</span>}
            <span className="font-medium text-foreground">
              {formatCurrency(funnel.predicted_investment)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
          <Copy className="h-4 w-4" />
          Copiar Link
        </Button>
        <Button variant="outline" size="sm" onClick={shareLink} className="gap-2">
          <Share2 className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {funnel.visibility === "public" ? (
                <Globe className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {funnel.visibility === "public" ? "Público" : "Privado"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={toggleVisibility}>
              {funnel.visibility === "public" ? (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Tornar Privado
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Tornar Público
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
