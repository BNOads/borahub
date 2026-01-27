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
  FunnelProducts,
  FunnelRevenue,
  FunnelMatchedSales,
} from "@/components/funnel-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Settings, Link2, BookOpen, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

  // Categorias que são "lançamentos" e precisam de campos extras
  const LAUNCH_CATEGORIES = ["Lançamento", "Meteórico", "Reabertura", "Evento presencial"];
  const isLaunchCategory = LAUNCH_CATEGORIES.includes(funnel.category || "");
  const isEventoPresencial = funnel.category === "Evento presencial";

  // Buscar itens pendentes do checklist
  const { data: pendingChecklistCount = 0 } = useQuery({
    queryKey: ['funnel-checklist-pending', funnel.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_checklist")
        .select("id")
        .eq("funnel_id", funnel.id)
        .eq("is_completed", false);
      
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!funnel.id,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alerta de Pontos de Atenção */}
      {pendingChecklistCount > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">Pontos de Atenção</h3>
              <ul className="mt-1 text-sm text-amber-700 dark:text-amber-400 list-disc list-inside">
                <li>Existem {pendingChecklistCount} itens pendentes no checklist de configuração</li>
              </ul>
            </div>
          </div>
        </div>
      )}

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
          <FunnelGeneralInfo funnel={funnel} onUpdate={fetchFunnel} isLaunchCategory={isLaunchCategory} isEventoPresencial={isEventoPresencial} />

          {/* Cards de Overview - Próximo Evento e Datas-chave só para lançamentos */}
          <div className={`grid grid-cols-1 ${isLaunchCategory ? "md:grid-cols-3" : "md:grid-cols-1"} gap-4`}>
            <FunnelBudgetOverview funnel={funnel} />
            {isLaunchCategory && <FunnelNextMilestone funnel={funnel} />}
            {isLaunchCategory && <FunnelKeyDates funnel={funnel} />}
          </div>

          {/* Faturamento e Links lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card de Faturamento dos Produtos */}
            <FunnelRevenue funnel={funnel} />

            {/* Links Úteis */}
            <FunnelLinksList funnelId={funnel.id} />
          </div>
        </TabsContent>

        {/* Tab: Configuração */}
        <TabsContent value="config" className="space-y-6">
          {/* Informações Gerais (com edição disponível) */}
          <FunnelGeneralInfo funnel={funnel} onUpdate={fetchFunnel} isLaunchCategory={isLaunchCategory} isEventoPresencial={isEventoPresencial} />

          {/* Produtos Vinculados */}
          <FunnelProducts funnelId={funnel.id} />

          {/* Vendas Associadas Automaticamente */}
          <FunnelMatchedSales funnelId={funnel.id} />

          {/* Metas */}
          <FunnelGoals funnel={funnel} onUpdate={fetchFunnel} />

          {/* Datas Operacionais - só para lançamentos */}
          {isLaunchCategory && <FunnelOperationalDates funnel={funnel} onUpdate={fetchFunnel} />}
        </TabsContent>

        {/* Tab: Links & Checklist */}
        <TabsContent value="links" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FunnelLinksList funnelId={funnel.id} />
            <FunnelChecklist funnelId={funnel.id} funnelCategory={funnel.category || undefined} />
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
