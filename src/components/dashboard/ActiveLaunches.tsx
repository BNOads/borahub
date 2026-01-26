import { ArrowRight, Rocket, TrendingUp, Calendar, Clock, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, parseISO, isAfter } from "date-fns";

type Funnel = Database["public"]["Tables"]["funnels"]["Row"];

const categoryColors: Record<string, string> = {
  "E-book": "border-blue-500 text-blue-500 bg-blue-500/10",
  "High ticket": "border-yellow-500 text-yellow-500 bg-yellow-500/10",
  "low-ticket": "border-green-500 text-green-500 bg-green-500/10",
  "Lançamento": "border-purple-500 text-purple-500 bg-purple-500/10",
  "Meteórico": "border-red-500 text-red-500 bg-red-500/10",
  "Reabertura": "border-orange-500 text-orange-500 bg-orange-500/10",
};

// Helper to calculate days until next milestone
function getNextMilestone(funnel: Funnel): { name: string; daysUntil: number } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const milestones: { name: string; date: string | null }[] = [
    { name: "Captação", date: funnel.captacao_start },
    { name: "Fim Captação", date: funnel.captacao_end },
    { name: "Aquecimento", date: funnel.aquecimento_start },
    { name: "Fim Aquecimento", date: funnel.aquecimento_end },
    { name: "CPL", date: funnel.cpl_start },
    { name: "Fim CPL", date: funnel.cpl_end },
    { name: "Lembrete", date: funnel.lembrete_start },
    { name: "Carrinho", date: funnel.carrinho_start },
    { name: "Fechamento", date: funnel.fechamento_date },
  ];

  // Filter future milestones and sort by date
  const futureMilestones = milestones
    .filter(m => m.date && isAfter(parseISO(m.date), today))
    .map(m => ({
      name: m.name,
      date: parseISO(m.date!),
      daysUntil: differenceInDays(parseISO(m.date!), today),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  if (futureMilestones.length === 0) return null;

  return {
    name: futureMilestones[0].name,
    daysUntil: futureMilestones[0].daysUntil,
  };
}

export function ActiveLaunches() {
  const { authReady, session, isAdmin } = useAuth();
  const { data: funnels = [], isLoading: loading } = useQuery({
    queryKey: ['funnels', 'active', session?.user?.id],
    queryFn: async () => {
      console.log("🔥 loadData disparado ActiveLaunches(funnels)", session?.user?.id);
      const { data, error } = await supabase
        .from("funnels")
        .select("*")
        .eq("status", "active")
        .eq("is_active", true)
        .order("predicted_investment", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching funnels:", error);
        throw error;
      }
      console.log("✅ Funis carregados:", data?.length);
      return data || [];
    },
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
    enabled: authReady && !!session,
  });

  // Fetch revenue for all active funnels (only for admins)
  const { data: funnelRevenues = {} } = useQuery({
    queryKey: ['funnels-revenues', funnels.map(f => f.id)],
    queryFn: async () => {
      if (!funnels.length) return {};

      // Get all funnel products
      const { data: funnelProducts } = await supabase
        .from("funnel_products")
        .select(`
          funnel_id,
          product_id,
          product:products(id, name)
        `)
        .in("funnel_id", funnels.map(f => f.id));

      if (!funnelProducts?.length) return {};

      // Get all active sales
      const { data: allSales } = await supabase
        .from("sales")
        .select("id, total_value, product_id, product_name")
        .eq("status", "active");

      if (!allSales?.length) return {};

      // Calculate revenue per funnel
      const revenues: Record<string, number> = {};

      // Lógica de match parcial - normaliza quebras de linha e hífens
      const matchesProductName = (saleName: string, productName: string) => {
        const normalizedSale = saleName.toLowerCase().replace(/[\n\r\-–—]/g, ' ').replace(/\s+/g, ' ');
        const keywords = productName.toLowerCase()
          .replace(/[\n\r\-–—]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 2);
        return keywords.every(keyword => normalizedSale.includes(keyword));
      };

      funnels.forEach(funnel => {
        const products = funnelProducts.filter(fp => fp.funnel_id === funnel.id);
        const productIds = products.map(p => p.product_id);
        const productNames = products
          .map(p => (p.product as { name: string } | null)?.name)
          .filter(Boolean) as string[];

        const matchedSales = allSales.filter(sale => {
          if (sale.product_id && productIds.includes(sale.product_id)) return true;
          if (sale.product_name) {
            return productNames.some(pn => matchesProductName(sale.product_name!, pn));
          }
          return false;
        });

        revenues[funnel.id] = matchedSales.reduce((sum, s) => sum + (s.total_value || 0), 0);
      });

      return revenues;
    },
    enabled: authReady && !!session && isAdmin && funnels.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 h-[200px] flex items-center justify-center">
        <span className="text-muted-foreground">Carregando funis...</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Funis Ativos</h2>
          <Badge className="bg-accent text-accent-foreground">
            {funnels.length}
          </Badge>
        </div>
        <Link to="/funis">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-accent">
            Ver todos
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {funnels.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum funil ativo no momento.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {funnels.map((funnel) => {
            const nextMilestone = getNextMilestone(funnel);
            
            return (
              <div
                key={funnel.id}
                className="min-w-[280px] flex-shrink-0 p-4 rounded-lg border border-border hover:border-accent/50 transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Rocket className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <Link to={`/funis/${funnel.id}`} className="hover:text-accent transition-colors">
                        <h3 className="font-medium truncate max-w-[150px]" title={funnel.name}>{funnel.name}</h3>
                      </Link>
                      {funnel.product_name && (
                        <p className="text-sm text-muted-foreground truncate max-w-[150px]" title={funnel.product_name}>
                          {funnel.product_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {funnel.category && (
                    <Badge
                      variant="outline"
                      className={categoryColors[funnel.category] || "border-muted-foreground text-muted-foreground"}
                    >
                      {funnel.category}
                    </Badge>
                  )}
                </div>

                {/* Next milestone countdown */}
                {nextMilestone && (
                  <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/50">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{nextMilestone.name}</p>
                      <p className={`text-sm font-semibold ${nextMilestone.daysUntil <= 3 ? 'text-destructive' : nextMilestone.daysUntil <= 7 ? 'text-yellow-600' : 'text-foreground'}`}>
                        {nextMilestone.daysUntil === 0 
                          ? "Hoje!" 
                          : nextMilestone.daysUntil === 1 
                            ? "Amanhã" 
                            : `${nextMilestone.daysUntil} dias`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Financial info - only for admins */}
                {isAdmin && (
                  <div className="space-y-1">
                    {/* Revenue */}
                    {funnelRevenues[funnel.id] !== undefined && funnelRevenues[funnel.id] > 0 && (
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <DollarSign className="h-4 w-4" />
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(funnelRevenues[funnel.id])}
                      </div>
                    )}
                    {/* Investment */}
                    <div className="flex items-center gap-1 text-accent font-semibold">
                      <TrendingUp className="h-4 w-4" />
                      {funnel.predicted_investment
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(funnel.predicted_investment)
                        : "R$ 0,00"
                      }
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
