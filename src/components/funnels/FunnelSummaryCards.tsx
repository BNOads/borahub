import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, DollarSign, CheckCircle2, TrendingUp } from "lucide-react";
import { CreateFunnelModal } from "./CreateFunnelModal";
import { useAuth } from "@/contexts/AuthContext";

interface FunnelSummaryCardsProps {
    activeCount: number;
    totalInvestment: number;
    totalRevenue: number;
    finishedCount: number;
    onFunnelCreated: () => void;
}

export function FunnelSummaryCards({ activeCount, totalInvestment, totalRevenue, finishedCount, onFunnelCreated }: FunnelSummaryCardsProps) {
    const { isAdmin } = useAuth();
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Funis Ativos
                    </CardTitle>
                    <Rocket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeCount}</div>
                    <p className="text-xs text-muted-foreground">
                        Funis em execução
                    </p>
                </CardContent>
            </Card>

            {isAdmin && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Faturamento Total
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Vendas dos produtos vinculados
                        </p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Investimento Total
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInvestment)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Previsto em funis ativos
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Funis Finalizados
                    </CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{finishedCount}</div>
                    <p className="text-xs text-muted-foreground">
                        Ciclos completados
                    </p>
                </CardContent>
            </Card>

            {isAdmin && (
                <div className="flex items-center justify-center p-6 border rounded-xl bg-muted/50 border-dashed">
                    <CreateFunnelModal onFunnelCreated={onFunnelCreated} />
                </div>
            )}
        </div>
    );
}
