import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTickets, type Ticket } from "@/hooks/useTickets";
import { startOfDay, startOfWeek, startOfMonth, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--destructive))", "hsl(var(--success))", "#8b5cf6", "#06b6d4"];

function getPeriodRange(period: string) {
  const now = new Date();
  if (period === "today") return { from: startOfDay(now), to: now };
  if (period === "week") return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
  return { from: startOfMonth(now), to: now };
}

export function TicketDashboard() {
  const { data: allTickets } = useTickets();
  const [period, setPeriod] = useState("month");

  const range = useMemo(() => getPeriodRange(period), [period]);

  const filtered = useMemo(() => {
    if (!allTickets) return [];
    return allTickets.filter((t) => {
      const d = parseISO(t.created_at);
      return d >= range.from && d <= range.to;
    });
  }, [allTickets, range]);

  const stats = useMemo(() => {
    const criados = filtered.length;
    const resolvidos = filtered.filter((t) => t.status === "encerrado" || t.status === "resolvido").length;
    const abertos = allTickets?.filter((t) => !["encerrado", "resolvido"].includes(t.status)).length ?? 0;
    const atrasados = allTickets?.filter((t) => t.sla_limite && new Date(t.sla_limite) < new Date() && !["encerrado", "resolvido"].includes(t.status)).length ?? 0;

    const resolved = filtered.filter((t) => t.tempo_resolucao);
    const avgResolution = resolved.length > 0
      ? Math.round(resolved.reduce((s, t) => s + (t.tempo_resolucao ?? 0), 0) / resolved.length)
      : 0;

    const withFirstResp = filtered.filter((t) => t.primeira_resposta_em);
    const avgFirstResp = withFirstResp.length > 0
      ? Math.round(withFirstResp.reduce((s, t) => {
          const diff = new Date(t.primeira_resposta_em!).getTime() - new Date(t.created_at).getTime();
          return s + diff / 60000;
        }, 0) / withFirstResp.length)
      : 0;

    return { criados, resolvidos, abertos, atrasados, avgResolution, avgFirstResp };
  }, [filtered, allTickets]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((t) => { map[t.categoria] = (map[t.categoria] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const byOrigem = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((t) => { map[t.origem] = (map[t.origem] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Ranking: quem mais resolve
  const topResolvers = useMemo(() => {
    if (!allTickets) return [];
    const map: Record<string, { name: string; count: number }> = {};
    allTickets
      .filter((t) => t.status === "encerrado" || t.status === "resolvido")
      .forEach((t) => {
        const name = t.responsavel?.display_name || t.responsavel?.full_name || "Sem responsável";
        const key = t.responsavel_id || "none";
        if (!map[key]) map[key] = { name, count: 0 };
        map[key].count++;
      });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [allTickets]);

  // Ranking: quem resolve mais rápido (menor tempo médio)
  const fastestResolvers = useMemo(() => {
    if (!allTickets) return [];
    const map: Record<string, { name: string; total: number; count: number }> = {};
    allTickets
      .filter((t) => (t.status === "encerrado" || t.status === "resolvido") && t.tempo_resolucao)
      .forEach((t) => {
        const name = t.responsavel?.display_name || t.responsavel?.full_name || "Sem responsável";
        const key = t.responsavel_id || "none";
        if (!map[key]) map[key] = { name, total: 0, count: 0 };
        map[key].total += t.tempo_resolucao!;
        map[key].count++;
      });
    return Object.values(map)
      .map((r) => ({ name: r.name, avg: Math.round(r.total / r.count), count: r.count }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 5);
  }, [allTickets]);

  const fmtMin = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {PERIOD_OPTIONS.map((p) => (
          <Button key={p.value} variant={period === p.value ? "default" : "outline"} size="sm" onClick={() => setPeriod(p.value)}>
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Criados" value={stats.criados} />
        <StatCard label="Resolvidos" value={stats.resolvidos} />
        <StatCard label="Abertos" value={stats.abertos} />
        <StatCard label="Atrasados" value={stats.atrasados} variant={stats.atrasados > 0 ? "destructive" : "default"} />
        <StatCard label="Tempo médio resposta" value={fmtMin(stats.avgFirstResp)} />
        <StatCard label="Tempo médio resolução" value={fmtMin(stats.avgResolution)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Por Categoria</CardTitle></CardHeader>
          <CardContent className="h-[250px]">
            {byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center pt-16">Sem dados</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Por Origem</CardTitle></CardHeader>
          <CardContent className="h-[250px]">
            {byOrigem.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byOrigem}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center pt-16">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">🏆 Quem mais resolve</CardTitle></CardHeader>
          <CardContent>
            {topResolvers.length > 0 ? (
              <div className="space-y-3">
                {topResolvers.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold w-5 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {i + 1}º
                      </span>
                      <span className="text-sm">{r.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{r.count} tickets</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">⚡ Quem resolve mais rápido</CardTitle></CardHeader>
          <CardContent>
            {fastestResolvers.length > 0 ? (
              <div className="space-y-3">
                {fastestResolvers.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold w-5 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {i + 1}º
                      </span>
                      <span className="text-sm">{r.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{fmtMin(r.avg)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({r.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, variant }: { label: string; value: string | number; variant?: "destructive" | "default" }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${variant === "destructive" ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
