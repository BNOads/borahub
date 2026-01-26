import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FunnelSummaryCards } from "@/components/funnels/FunnelSummaryCards";
import { FunnelCategoryChart } from "@/components/funnels/FunnelCategoryChart";
import { ActiveFunnelsTable } from "@/components/funnels/ActiveFunnelsTable";
import { FinishedFunnelsTable } from "@/components/funnels/FinishedFunnelsTable";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type Funnel = Database["public"]["Tables"]["funnels"]["Row"];

export default function FunisView() {
    const { isAdmin } = useAuth();
    const [activeFunnels, setActiveFunnels] = useState<Funnel[]>([]);
    const [finishedFunnels, setFinishedFunnels] = useState<Funnel[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchFunnels = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("funnels")
                .select("*")
                .order("predicted_investment", { ascending: false, nullsFirst: false })
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (data) {
                const active = data.filter(f => f.status === 'active');
                setActiveFunnels(active);
                setFinishedFunnels(data.filter(f => f.status === 'finished'));
                
                // Fetch revenue for active funnels if admin
                if (isAdmin && active.length > 0) {
                    await fetchTotalRevenue(active.map(f => f.id));
                }
            }
        } catch (error) {
            console.error("Error fetching funnels:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTotalRevenue = async (funnelIds: string[]) => {
        try {
            // Get all funnel products
            const { data: funnelProducts } = await supabase
                .from("funnel_products")
                .select(`
                    funnel_id,
                    product_id,
                    product:products(id, name)
                `)
                .in("funnel_id", funnelIds);

            if (!funnelProducts?.length) {
                setTotalRevenue(0);
                return;
            }

            // Get all active sales
            const { data: allSales } = await supabase
                .from("sales")
                .select("id, total_value, product_id, product_name")
                .eq("status", "active");

            if (!allSales?.length) {
                setTotalRevenue(0);
                return;
            }

            const productIds = funnelProducts.map(p => p.product_id);
            const productNames = funnelProducts
                .map(p => (p.product as { name: string } | null)?.name)
                .filter(Boolean) as string[];

            // Calculate total revenue
            const matchedSales = allSales.filter(sale => {
                if (sale.product_id && productIds.includes(sale.product_id)) return true;
                if (!sale.product_id && sale.product_name) {
                    return productNames.some(pn => sale.product_name?.toLowerCase() === pn.toLowerCase());
                }
                return false;
            });

            const revenue = matchedSales.reduce((sum, s) => sum + (s.total_value || 0), 0);
            setTotalRevenue(revenue);
        } catch (error) {
            console.error("Error fetching revenue:", error);
            setTotalRevenue(0);
        }
    };

    useEffect(() => {
        fetchFunnels();
    }, [isAdmin]);

    const totalInvestment = activeFunnels.reduce((acc, curr) => acc + (curr.predicted_investment || 0), 0);

    const filterFunnels = (funnels: Funnel[]) => {
        return funnels.filter(f =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.product_name && f.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (f.category && f.category.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    };

    const filteredActive = filterFunnels(activeFunnels);
    const filteredFinished = filterFunnels(finishedFunnels);

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold">Funis de Venda</h1>
                <p className="text-muted-foreground mt-1">
                    Gerencie e acompanhe o desempenho dos seus funis
                </p>
            </div>

            <FunnelSummaryCards
                activeCount={activeFunnels.length}
                totalInvestment={totalInvestment}
                totalRevenue={totalRevenue}
                finishedCount={finishedFunnels.length}
                onFunnelCreated={fetchFunnels}
            />

            <FunnelCategoryChart funnels={activeFunnels} />

            <div className="flex items-center gap-4 max-w-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Pesquisar funil, produto..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="active">Funis Ativos</TabsTrigger>
                    <TabsTrigger value="finished">Funis Finalizados</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="space-y-4">
                    <ActiveFunnelsTable funnels={filteredActive} onUpdate={fetchFunnels} />
                </TabsContent>
                <TabsContent value="finished" className="space-y-4">
                    <FinishedFunnelsTable funnels={filteredFinished} onUpdate={fetchFunnels} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
