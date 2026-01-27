import { useMemo } from "react";
import {
    Pie,
    PieChart,
    Cell,
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
    const { isAdmin } = useAuth();

    // Fetch revenue by category
    const { data: revenueByCategory = {} } = useQuery({
        queryKey: ['funnels-revenue-by-category', funnels.map(f => f.id)],
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

            // Get active sales
            const { data: allSales } = await supabase
                .from("sales")
                .select("id, total_value, product_id, product_name")
                .eq("status", "active");

            if (!allSales?.length) return {};

            const IGNORED_WORDS = ['2023', '2024', '2025', '2026', '2027', '2028', 'mba', 'ciclo'];

            const matchesProductName = (saleName: string, productName: string) => {
                const normalizedSale = saleName.toLowerCase().replace(/[\n\r\-–—]/g, ' ').replace(/\s+/g, ' ');
                const keywords = productName.toLowerCase()
                    .replace(/[\n\r\-–—]/g, ' ')
                    .split(/\s+/)
                    .filter(word => word.length > 2 && !IGNORED_WORDS.includes(word));
                if (keywords.length === 0) return false;
                return keywords.every(keyword => normalizedSale.includes(keyword));
            };

            // Calculate revenue per category
            const categoryRevenue: Record<string, number> = {};

            funnels.forEach(funnel => {
                const category = funnel.category || "Sem Categoria";
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

                const revenue = matchedSales.reduce((sum, s) => sum + (s.total_value || 0), 0);
                categoryRevenue[category] = (categoryRevenue[category] || 0) + revenue;
            });

            return categoryRevenue;
        },
        enabled: isAdmin && funnels.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    const investmentChartData = useMemo(() => {
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

    const revenueChartData = useMemo(() => {
        return Object.entries(revenueByCategory)
            .map(([category, total], index) => ({
                category,
                total,
                fill: COLORS[index % COLORS.length]
            }))
            .filter(item => item.total > 0)
            .sort((a, b) => b.total - a.total);
    }, [revenueByCategory]);

    const investmentChartConfig = useMemo(() => {
        const config: any = {
            total: {
                label: "Investimento",
            }
        };
        investmentChartData.forEach((item) => {
            config[item.category] = {
                label: item.category,
                color: item.fill
            };
        });
        return config;
    }, [investmentChartData]);

    const revenueChartConfig = useMemo(() => {
        const config: any = {
            total: {
                label: "Faturamento",
            }
        };
        revenueChartData.forEach((item) => {
            config[item.category] = {
                label: item.category,
                color: item.fill
            };
        });
        return config;
    }, [revenueChartData]);

    if (funnels.length === 0) return null;

    const hasRevenueData = revenueChartData.length > 0;

    return (
        <div className={`grid gap-4 ${isAdmin && hasRevenueData ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Investimento por Categoria */}
            <Card>
                <CardHeader className="items-center pb-0">
                    <CardTitle>Investimento por Categoria</CardTitle>
                    <CardDescription>
                        Distribuição proporcional do investimento previsto
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                    <div className="h-[350px] w-full">
                        <ChartContainer
                            config={investmentChartConfig}
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
                                                        style={{ backgroundColor: investmentChartConfig[name as string]?.color }}
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
                                    data={investmentChartData}
                                    dataKey="total"
                                    nameKey="category"
                                    innerRadius={60}
                                    strokeWidth={5}
                                >
                                    {investmentChartData.map((entry, index) => (
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

            {/* Faturamento por Categoria - apenas para admins */}
            {isAdmin && hasRevenueData && (
                <Card>
                    <CardHeader className="items-center pb-0">
                        <CardTitle>Faturamento por Categoria</CardTitle>
                        <CardDescription>
                            Distribuição proporcional do faturamento realizado
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 pb-0">
                        <div className="h-[350px] w-full">
                            <ChartContainer
                                config={revenueChartConfig}
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
                                                            style={{ backgroundColor: revenueChartConfig[name as string]?.color }}
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
                                        data={revenueChartData}
                                        dataKey="total"
                                        nameKey="category"
                                        innerRadius={60}
                                        strokeWidth={5}
                                    >
                                        {revenueChartData.map((entry, index) => (
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
            )}
        </div>
    );
}
