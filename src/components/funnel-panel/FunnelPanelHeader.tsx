import { useState } from "react";
import { ArrowLeft, Copy, Globe, Lock, Pencil, Share2 } from "lucide-react";
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
import { EditFunnelModal } from "@/components/funnels/EditFunnelModal";

interface FunnelPanelHeaderProps {
  funnel: FunnelData;
  onUpdate: () => void;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500 text-white",
  finished: "bg-blue-500 text-white",
  archived: "bg-gray-500 text-white",
};

const statusLabels: Record<string, string> = {
  active: "EM CAPTAÇÃO",
  finished: "FINALIZADO",
  archived: "ARQUIVADO",
};

export function FunnelPanelHeader({ funnel, onUpdate }: FunnelPanelHeaderProps) {
  const navigate = useNavigate();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const copyLink = () => {
    const url = `${window.location.origin}/funis/${funnel.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const copyReportLink = () => {
    const url = `${window.location.origin}/relatorio-funil/${funnel.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link do relatório copiado!");
  };

  const isHighTicket = funnel.category === "High ticket";

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
    <>
      <div className="bg-card rounded-2xl border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(-1)} 
              className="gap-2 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold">
                {funnel.name}
                {funnel.code && <span className="text-muted-foreground"> | {funnel.code}</span>}
              </h1>
              
              <div className="flex items-center gap-2">
                <Badge className={statusColors[funnel.status || "active"]}>
                  {statusLabels[funnel.status || "active"]}
                </Badge>
                
                {funnel.category && (
                  <Badge variant="outline" className="text-xs font-medium">
                    {funnel.category}
                  </Badge>
                )}
                
                {funnel.predicted_investment && funnel.predicted_investment > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {formatCurrency(funnel.predicted_investment)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEditModalOpen(true)} 
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copiar Link</span>
            </Button>
            {isHighTicket && (
              <Button variant="outline" size="sm" onClick={copyReportLink} className="gap-2">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Link Relatório</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {funnel.visibility === "public" ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {funnel.visibility === "public" ? "Público" : "Privado"}
                  </span>
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
      </div>

      <EditFunnelModal
        funnel={funnel}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onFunnelUpdated={onUpdate}
      />
    </>
  );
}
