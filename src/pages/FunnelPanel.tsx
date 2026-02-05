import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FunnelData,
  FunnelPanelHeader,
  FunnelBudgetOverview,
  FunnelStagesCard,
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
  FunnelDailyReport,
} from "@/components/funnel-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Settings, BookOpen, AlertTriangle, ClipboardList, Sparkles, FileText } from "lucide-react";
import { FunnelCopyAgent } from "@/components/funnel-panel/FunnelCopyAgent";
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

  // Buscar itens pendentes do checklist - hook deve estar antes dos early returns
  const { data: pendingChecklistCount = 0 } = useQuery({
    queryKey: ['funnel-checklist-pending', id],
    queryFn: async () => {
      if (!id) return 0;
      const { data, error } = await supabase
        .from("funnel_checklist")
        .select("id")
        .eq("funnel_id", id)
        .eq("is_completed", false);
      
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!id,
  });

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
  const isHighTicket = funnel.category === "High ticket";

  // Número de tabs dinâmico baseado na categoria
  const tabCount = isHighTicket ? 4 : 5;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alerta de Pontos de Atenção - só para não High Ticket */}
      {!isHighTicket && pendingChecklistCount > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground">Pontos de Atenção</h3>
              <ul className="mt-1 text-sm text-muted-foreground list-disc list-inside">
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
        <TabsList className={`grid w-full h-12`} style={{ gridTemplateColumns: `repeat(${tabCount}, 1fr)` }}>
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuração</span>
          </TabsTrigger>
          {!isHighTicket && (
            <TabsTrigger value="checklist" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Checklist</span>
            </TabsTrigger>
          )}
          {isHighTicket && (
            <TabsTrigger value="relatorio" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Relatório</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="copy-agent" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Agente de Copy</span>
          </TabsTrigger>
          {!isHighTicket && (
            <TabsTrigger value="diary" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Deu Bom & Deu Mole</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
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

        {/* Tab: Checklist - só para não High Ticket */}
        {!isHighTicket && (
          <TabsContent value="checklist" className="space-y-6">
            <FunnelChecklist funnelId={funnel.id} funnelCategory={funnel.category || undefined} />
          </TabsContent>
        )}

        {/* Tab: Relatório - só para High Ticket */}
        {isHighTicket && (
          <TabsContent value="relatorio" className="space-y-6">
            <FunnelStagesCard funnelId={funnel.id} />
            <FunnelDailyReport funnel={funnel} onUpdate={fetchFunnel} />
          </TabsContent>
        )}

        {/* Tab: Agente de Copy */}
        <TabsContent value="copy-agent" className="space-y-6">
          <FunnelCopyAgent funnel={funnel} />
        </TabsContent>

        {/* Tab: Diário - só para não High Ticket */}
        {!isHighTicket && (
          <TabsContent value="diary" className="space-y-6">
            <FunnelDiary funnelId={funnel.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
