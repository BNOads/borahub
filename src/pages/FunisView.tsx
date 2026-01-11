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

type Funnel = Database["public"]["Tables"]["funnels"]["Row"];

export default function FunisView() {
    const [activeFunnels, setActiveFunnels] = useState<Funnel[]>([]);
    const [finishedFunnels, setFinishedFunnels] = useState<Funnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchFunnels = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("funnels")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (data) {
                setActiveFunnels(data.filter(f => f.status === 'active'));
                setFinishedFunnels(data.filter(f => f.status === 'finished'));
            }
        } catch (error) {
            console.error("Error fetching funnels:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFunnels();
    }, []);

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
