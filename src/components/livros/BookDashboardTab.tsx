import { useMemo } from "react";
import { Package, Truck, Clock, CheckCircle2, TrendingUp, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useBookShipments, BOOK_STAGES } from "@/hooks/useBookShipments";
import { format, subDays, differenceInHours, startOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const PIE_COLORS = [
  "hsl(210, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(35, 80%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(145, 60%, 45%)",
];

export function BookDashboardTab() {
  const { data: shipments = [], isLoading } = useBookShipments();

  const today = startOfDay(new Date());
  const last7 = subDays(today, 7);
  const last30 = subDays(today, 30);

  const stats = useMemo(() => {
    const todayCount = shipments.filter(s => s.sale_date && startOfDay(new Date(s.sale_date)).getTime() === today.getTime()).length;
    const weekCount = shipments.filter(s => s.sale_date && new Date(s.sale_date) >= last7).length;
    const monthCount = shipments.filter(s => s.sale_date && new Date(s.sale_date) >= last30).length;

    const stageCounts: Record<string, number> = {};
    BOOK_STAGES.forEach(s => { stageCounts[s.key] = 0; });
    shipments.forEach(s => { stageCounts[s.stage] = (stageCounts[s.stage] || 0) + 1; });

    // Average time: sale → tracking code
    const withTracking = shipments.filter(s => s.sale_date && s.label_generated_at);
    const avgToTracking = withTracking.length > 0
      ? withTracking.reduce((sum, s) => sum + differenceInHours(new Date(s.label_generated_at!), new Date(s.sale_date!)), 0) / withTracking.length
      : 0;

    // Average time: tracking → shipped
    const withShipped = shipments.filter(s => s.label_generated_at && s.shipped_at);
    const avgToShipped = withShipped.length > 0
      ? withShipped.reduce((sum, s) => sum + differenceInHours(new Date(s.shipped_at!), new Date(s.label_generated_at!)), 0) / withShipped.length
      : 0;

    // Delayed: > 72h without tracking
    const delayed = shipments.filter(s => {
      if (s.stage !== "venda") return false;
      if (!s.sale_date) return false;
      return differenceInHours(new Date(), new Date(s.sale_date)) > 72;
    }).length;

    return { todayCount, weekCount, monthCount, stageCounts, avgToTracking, avgToShipped, delayed };
  }, [shipments, today, last7, last30]);

  // Product ranking
  const productRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    shipments.forEach(s => { counts[s.product_name] = (counts[s.product_name] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [shipments]);

  // Daily sales chart (last 14 days)
  const dailyChart = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = subDays(today, i);
      const count = shipments.filter(s => s.sale_date && startOfDay(new Date(s.sale_date)).getTime() === d.getTime()).length;
      days.push({ date: format(d, "dd/MM", { locale: ptBR }), count });
    }
    return days;
  }, [shipments, today]);

  const pieData = BOOK_STAGES.map((stage, i) => ({
    name: stage.label,
    value: stats.stageCounts[stage.key] || 0,
    color: PIE_COLORS[i],
  })).filter(d => d.value > 0);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>;
  }

  const formatHours = (h: number) => {
    if (h < 24) return `${Math.round(h)}h`;
    return `${Math.round(h / 24)}d`;
  };

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Hoje</p>
          <p className="text-2xl font-bold">{stats.todayCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Semana</p>
          <p className="text-2xl font-bold">{stats.weekCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Mês</p>
          <p className="text-2xl font-bold">{stats.monthCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{shipments.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Clock className="h-3 w-3" />Venda→Etiqueta</p>
          <p className="text-2xl font-bold">{formatHours(stats.avgToTracking)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Truck className="h-3 w-3" />Etiqueta→Envio</p>
          <p className="text-2xl font-bold">{formatHours(stats.avgToShipped)}</p>
        </CardContent></Card>
        <Card className={stats.delayed > 0 ? "border-destructive" : ""}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Atrasados</p>
            <p className={`text-2xl font-bold ${stats.delayed > 0 ? "text-destructive" : ""}`}>{stats.delayed}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Vendas por Dia (14 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyChart}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" />Distribuição por Estágio</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product ranking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" />Ranking de Livros</CardTitle>
        </CardHeader>
        <CardContent>
          {productRanking.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(150, productRanking.length * 35)}>
              <BarChart data={productRanking} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Vendas" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-4">Nenhum livro registrado</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
