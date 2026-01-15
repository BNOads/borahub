import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FunnelData,
  FunnelPanelHeader,
  FunnelBudgetOverview,
  FunnelNextMilestone,
  FunnelKeyDates,
  FunnelGeneralInfo,
  FunnelGoals,
  FunnelOperationalDates,
  FunnelLinksList,
  FunnelDiary,
  FunnelChecklist,
} from "@/components/funnel-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Settings, Link2, BookOpen } from "lucide-react";

export default function FunnelPanel() {
  const { id } = useParams();
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFunnel = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("funnels")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setFunnel(data as FunnelData);
    } catch (error) {
      console.error("Error fetching funnel:", error);
      toast.error("Erro ao carregar funil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunnel();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-24 bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Funil não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <FunnelPanelHeader funnel={funnel} onUpdate={fetchFunnel} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuração</span>
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Links & Checklist</span>
          </TabsTrigger>
          <TabsTrigger value="diary" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Deu Bom & Deu Mole</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {/* Informações Gerais (modo visualização) - Acima de tudo */}
          <FunnelGeneralInfo funnel={funnel} onUpdate={fetchFunnel} />

          {/* Cards de Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FunnelBudgetOverview funnel={funnel} />
            <FunnelNextMilestone funnel={funnel} />
            <FunnelKeyDates funnel={funnel} />
          </div>
        </TabsContent>

        {/* Tab: Configuração */}
        <TabsContent value="config" className="space-y-6">
          {/* Informações Gerais (com edição disponível) */}
          <FunnelGeneralInfo funnel={funnel} onUpdate={fetchFunnel} />

          {/* Metas */}
          <FunnelGoals funnel={funnel} onUpdate={fetchFunnel} />

          {/* Datas Operacionais */}
          <FunnelOperationalDates funnel={funnel} onUpdate={fetchFunnel} />
        </TabsContent>

        {/* Tab: Links & Checklist */}
        <TabsContent value="links" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FunnelLinksList funnelId={funnel.id} />
            <FunnelChecklist funnelId={funnel.id} />
          </div>
        </TabsContent>

        {/* Tab: Diário */}
        <TabsContent value="diary" className="space-y-6">
          <FunnelDiary funnelId={funnel.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
