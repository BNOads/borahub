import { useMemo } from "react";
import {
    Pie,
    PieChart,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart";
import { Database } from "@/integrations/supabase/types";

type Funnel = Database["public"]["Tables"]["funnels"]["Row"];

interface FunnelCategoryChartProps {
    funnels: Funnel[];
}

const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "#3b82f6", // blue-500
    "#8b5cf6", // purple-500
    "#f59e0b", // amber-500
    "#10b981", // emerald-500
    "#ef4444", // red-500
];

export function FunnelCategoryChart({ funnels }: FunnelCategoryChartProps) {
    const chartData = useMemo(() => {
        const categories: Record<string, number> = {};

        funnels.forEach((funnel) => {
            const category = funnel.category || "Sem Categoria";
            const investment = funnel.predicted_investment || 0;
            categories[category] = (categories[category] || 0) + investment;
        });

        return Object.entries(categories)
            .map(([category, total], index) => ({
                category,
                total,
                fill: COLORS[index % COLORS.length]
            }))
            .sort((a, b) => b.total - a.total);
    }, [funnels]);

    const chartConfig = useMemo(() => {
        const config: any = {
            total: {
                label: "Investimento",
            }
        };
        chartData.forEach((item, index) => {
            config[item.category] = {
                label: item.category,
                color: item.fill
            };
        });
        return config;
    }, [chartData]);

    if (funnels.length === 0) return null;

    return (
        <Card className="col-span-full">
            <CardHeader className="items-center pb-0">
                <CardTitle>Investimento por Categoria</CardTitle>
                <CardDescription>
                    Distribuição proporcional do investimento previsto
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <div className="h-[350px] w-full">
                    <ChartContainer
                        config={chartConfig}
                        className="mx-auto aspect-square max-h-[300px]"
                    >
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        hideLabel
                                        formatter={(value, name) => (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-2 w-2 rounded-full"
                                                    style={{ backgroundColor: chartConfig[name as string]?.color }}
                                                />
                                                <span className="font-medium">{name}:</span>
                                                <span>
                                                    {new Intl.NumberFormat("pt-BR", {
                                                        style: "currency",
                                                        currency: "BRL",
                                                    }).format(Number(value))}
                                                </span>
                                            </div>
                                        )}
                                    />
                                }
                            />
                            <Pie
                                data={chartData}
                                dataKey="total"
                                nameKey="category"
                                innerRadius={60}
                                strokeWidth={5}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <ChartLegend
                                content={<ChartLegendContent nameKey="category" />}
                                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                            />
                        </PieChart>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
    );
}
