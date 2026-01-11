import { useEffect, useState } from "react";
import { ArrowRight, Rocket, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Funnel = Database["public"]["Tables"]["funnels"]["Row"] & { category?: string };

const categoryColors: Record<string, string> = {
  "E-book": "border-blue-500 text-blue-500 bg-blue-500/10",
  "High ticket": "border-yellow-500 text-yellow-500 bg-yellow-500/10",
  "low-ticket": "border-green-500 text-green-500 bg-green-500/10",
  "Lançamento": "border-purple-500 text-purple-500 bg-purple-500/10",
  "Meteórico": "border-red-500 text-red-500 bg-red-500/10",
  "Reabertura": "border-orange-500 text-orange-500 bg-orange-500/10",
};

export function ActiveLaunches() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFunnels = async () => {
      try {
        // Fetch funnels that are marked as status='active' AND is_active=true
        const { data, error } = await supabase
          .from("funnels")
          .select("*")
          .eq("status", "active")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching funnels:", error);
          return;
        }

        setFunnels(data || []);
      } catch (error) {
        console.error("Error fetching funnels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFunnels();
  }, []);

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
          {funnels.map((funnel) => (
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
                    <p className="text-sm text-muted-foreground">
                      {new Date(funnel.created_at).toLocaleDateString()}
                    </p>
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
                {funnel.product_name && (
                  <Badge variant="outline" className="border-muted-foreground text-muted-foreground truncate max-w-[120px]">
                    {funnel.product_name}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1 text-accent font-semibold">
                  <TrendingUp className="h-4 w-4" />
                  {funnel.predicted_investment
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(funnel.predicted_investment)
                    : "R$ 0,00"
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
