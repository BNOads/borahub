import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Users, UserCheck, CalendarCheck, CheckCircle2, DollarSign, ExternalLink, Calendar, Loader2, Percent, TrendingUp, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, CartesianGrid, Legend } from "recharts";
import { usePublicSession, usePublicLeads, usePublicDailyReports, usePublicLinks, useGoogleCalendarEvents, useUTMAnalytics } from "@/hooks/useStrategicSession";
import { computeLeadScore } from "@/lib/leadScoring";

const PIE_COLORS = [
  "hsl(210, 70%, 55%)", "hsl(280, 60%, 55%)", "hsl(35, 80%, 55%)",
  "hsl(160, 60%, 45%)", "hsl(350, 65%, 55%)", "hsl(190, 60%, 50%)",
  "hsl(var(--primary))", "hsl(var(--accent))",
];

type SortKey = "name" | "total" | "qualified" | "qualPercent";
type SortDir = "asc" | "desc";

function SortableUTMTable({ data, title, label }: { data: { name: string; total: number; qualified: number; vendas: number; convPercent: number }[]; title: string; label: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;

  const filtered = data.filter(s => s.name !== "Sem dados");
  if (filtered.length === 0) return null;

  const withQualPercent = filtered.map(s => ({
    ...s,
    qualPercent: s.total > 0 ? Math.round((s.qualified / s.total) * 100 * 10) / 10 : 0,
  }));

  const allQualPercents = withQualPercent.map(s => s.qualPercent);
  const minQual = Math.min(...allQualPercents);
  const maxQual = Math.max(...allQualPercents);

  const getQualColor = (val: number) => {
    if (maxQual === minQual) return "hsl(210, 15%, 95%)";
    const ratio = (val - minQual) / (maxQual - minQual);
    const hue = Math.round(ratio * 120);
    return `hsl(${hue}, 65%, 90%)`;
  };
  const getQualTextColor = (val: number) => {
    if (maxQual === minQual) return "hsl(210, 15%, 30%)";
    const ratio = (val - minQual) / (maxQual - minQual);
    const hue = Math.round(ratio * 120);
    return `hsl(${hue}, 70%, 30%)`;
  };

  const sorted = [...withQualPercent].sort((a, b) => {
    const aVal = a[sortKey]; const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const toggleSort = (key: SortKey) => { if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("desc"); } setPage(0); };
  const arrow = (key: SortKey) => sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("name")}>{label}{arrow("name")}</th>
                <th className="pb-2 font-medium text-muted-foreground text-right cursor-pointer select-none" onClick={() => toggleSort("total")}>Leads{arrow("total")}</th>
                <th className="pb-2 font-medium text-muted-foreground text-right cursor-pointer select-none" onClick={() => toggleSort("qualified")}>Qualificados{arrow("qualified")}</th>
                <th className="pb-2 font-medium text-muted-foreground text-right cursor-pointer select-none" onClick={() => toggleSort("qualPercent")}>Qualif. %{arrow("qualPercent")}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(s => (
                <tr key={s.name} className="border-b last:border-0">
                  <td className="py-2 font-medium">{s.name}</td>
                  <td className="py-2 text-right">{s.total}</td>
                  <td className="py-2 text-right">{s.qualified}</td>
                  <td className="py-2 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: getQualColor(s.qualPercent), color: getQualTextColor(s.qualPercent) }}>
                      {s.qualPercent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t">
            <span className="text-xs text-muted-foreground">{sorted.length} itens · Página {page + 1}/{totalPages}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PublicSessaoEstrategica() {
  const { slug } = useParams<{ slug: string }>();
  const { data: session, isLoading } = usePublicSession(slug);
  const { data: leads = [] } = usePublicLeads(session?.id);
  const { data: reports = [] } = usePublicDailyReports(session?.id);
  const { data: links = [] } = usePublicLinks(session?.id);
  const { data: calendarEvents = [] } = useGoogleCalendarEvents(session?.google_calendar_id);
  const { data: utmData } = useUTMAnalytics(session?.id);

  const [chartStartDate, setChartStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
  });
  const [chartEndDate, setChartEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!session) return <div className="text-center py-20 text-muted-foreground">Sessão não encontrada</div>;

  const qualifiedByScoring = leads.filter(l => computeLeadScore(l).isQualified).length;
  const totalLeads = leads.length;

  const stageCounts = {
    lead: leads.filter(l => l.stage === "lead").length,
    qualificado: qualifiedByScoring,
    agendado: leads.filter(l => l.stage === "agendado").length,
    realizado: leads.filter(l => l.stage === "realizado").length,
    venda: leads.filter(l => l.stage === "venda").length,
  };

  const qualRate = totalLeads > 0 ? ((qualifiedByScoring / totalLeads) * 100).toFixed(1) : "0";
  const vendasCount = stageCounts.venda;
  const convRate = totalLeads > 0 ? ((vendasCount / totalLeads) * 100).toFixed(1) : "0";

  const kpis = [
    { key: "lead", label: "Leads", icon: Users, color: "text-blue-500" },
    { key: "qualificado", label: "Qualificados", icon: UserCheck, color: "text-purple-500" },
    { key: "agendado", label: "Agendados", icon: CalendarCheck, color: "text-orange-500" },
    { key: "realizado", label: "Realizados", icon: CheckCircle2, color: "text-emerald-500" },
    { key: "venda", label: "Vendas", icon: DollarSign, color: "text-green-600" },
  ];

  const now = new Date();
  const sourcePie = ((utmData as any)?.bySource || []).filter((s: any) => s.name !== "Sem dados").slice(0, 8);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{session.name}</h1>
        {session.description && <p className="text-muted-foreground mt-1">{session.description}</p>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.key}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                <span className="text-2xl font-bold">{stageCounts[kpi.key as keyof typeof stageCounts]}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Total de Leads</span></div>
            <p className="text-2xl font-bold mt-1">{totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2"><Percent className="h-4 w-4 text-purple-500" /><span className="text-xs text-muted-foreground">Taxa Qualificação</span></div>
            <p className="text-2xl font-bold mt-1">{qualRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Taxa Conversão</span></div>
            <p className="text-2xl font-bold mt-1">{convRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Vendas</span></div>
            <p className="text-2xl font-bold mt-1">{vendasCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Leads Chart */}
      <PublicDailyLeadsChart leads={leads} chartStartDate={chartStartDate} chartEndDate={chartEndDate} setChartStartDate={setChartStartDate} setChartEndDate={setChartEndDate} />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Google Calendar */}
        {session.google_calendar_id && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" />Reuniões de Hoje</CardTitle></CardHeader>
            <CardContent>
              {calendarEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma reunião hoje</p>
              ) : (
                <div className="space-y-2">
                  {calendarEvents.map((ev: any, i: number) => {
                    const start = new Date(ev.start);
                    const end = new Date(ev.end);
                    const isNow = now >= start && now <= end;
                    return (
                      <div key={i} className={`p-2 rounded-md border ${isNow ? "border-primary bg-primary/5" : ""}`}>
                        <p className="text-sm font-medium">{ev.summary}</p>
                        <p className="text-xs text-muted-foreground">
                          {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {isNow && <Badge className="mt-1 bg-primary text-primary-foreground text-xs">Ao vivo</Badge>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Source Pie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por Origem</CardTitle></CardHeader>
          <CardContent>
            {sourcePie.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Sem dados de origem</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={sourcePie} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                      {sourcePie.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => [val, "Leads"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {sourcePie.map((s: any, i: number) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="truncate max-w-[120px]">{s.name}</span>
                      </div>
                      <span className="font-medium">{s.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* UTM Tables */}
      <div className="grid md:grid-cols-2 gap-6">
        {(utmData as any)?.bySource && <SortableUTMTable data={(utmData as any).bySource} title="Taxa de Qualificação por Origem" label="Origem" />}
        {(utmData as any)?.byMedium && <SortableUTMTable data={(utmData as any).byMedium} title="Taxa de Qualificação por Público" label="Público" />}
        {(utmData as any)?.byCampaign && <SortableUTMTable data={(utmData as any).byCampaign} title="Taxa de Qualificação por Campanha" label="Campanha" />}
        {(utmData as any)?.byContent && <SortableUTMTable data={(utmData as any).byContent} title="Taxa de Qualificação por Criativo" label="Criativo" />}
        {(utmData as any)?.byTerm && <SortableUTMTable data={(utmData as any).byTerm} title="Taxa de Qualificação por Tráfego" label="Tráfego" />}
      </div>

      {/* Links */}
      {links.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Links Úteis</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-2">
            {links.map((link: any) => (
              <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-md border hover:bg-muted transition-colors">
                <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm">{link.name}</span>
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Reports */}
      {reports.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Relatório Mais Recente</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {reports.map((r: any) => (
                <div key={r.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{r.report_type === "sdr" ? "SDR" : "Closer"}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(r.report_date).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Contatos:</span> {r.contacts}</div>
                    <div><span className="text-muted-foreground">Agendados:</span> {r.meetings_scheduled}</div>
                    <div><span className="text-muted-foreground">Realizados:</span> {r.meetings_held}</div>
                    <div><span className="text-muted-foreground">Vendas:</span> {r.sales}</div>
                    <div><span className="text-muted-foreground">No-show:</span> {r.no_shows}</div>
                  </div>
                  {r.summary && <p className="text-sm text-muted-foreground">{r.summary}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PublicDailyLeadsChart({ leads, chartStartDate, chartEndDate, setChartStartDate, setChartEndDate }: {
  leads: any[];
  chartStartDate: string;
  chartEndDate: string;
  setChartStartDate: (v: string) => void;
  setChartEndDate: (v: string) => void;
}) {
  const dailyLeadsData = useMemo(() => {
    const dateMap = new Map<string, { date: string; qualificados: number; desqualificados: number; total: number }>();
    for (const lead of leads) {
      const rawDate = (lead.extra_data as Record<string, string> | null)?.data;
      if (!rawDate) continue;
      const date = rawDate.length >= 10 ? rawDate.substring(0, 10) : rawDate;
      if (date < chartStartDate || date > chartEndDate) continue;
      if (!dateMap.has(date)) dateMap.set(date, { date, qualificados: 0, desqualificados: 0, total: 0 });
      const entry = dateMap.get(date)!;
      entry.total++;
      if (computeLeadScore(lead).isQualified) entry.qualificados++;
      else entry.desqualificados++;
    }
    return [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date)).map(d => {
      const [, mm, dd] = d.date.split("-");
      return { ...d, date: `${dd}/${mm}`, taxaQualificacao: d.total > 0 ? Math.round((d.qualificados / d.total) * 100) : 0 };
    });
  }, [leads, chartStartDate, chartEndDate]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm">Leads por Dia</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input type="date" value={chartStartDate} onChange={e => setChartStartDate(e.target.value)} className="h-7 text-xs w-[130px]" />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input type="date" value={chartEndDate} onChange={e => setChartEndDate(e.target.value)} className="h-7 text-xs w-[130px]" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {dailyLeadsData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Sem dados de leads no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={dailyLeadsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(val: number, name: string) => {
                if (name === "qualificados") return [val, "Qualificados"];
                if (name === "desqualificados") return [val, "Desqualificados"];
                if (name === "total") return [val, "Total"];
                if (name === "taxaQualificacao") return [`${val}%`, "Taxa Qualificação"];
                return [val, name];
              }} />
              <Legend formatter={(value) => {
                if (value === "qualificados") return "Qualificados";
                if (value === "desqualificados") return "Desqualificados";
                if (value === "total") return "Total";
                if (value === "taxaQualificacao") return "Taxa Qualificação";
                return value;
              }} />
              <Bar yAxisId="left" dataKey="qualificados" stackId="a" fill="hsl(145, 60%, 45%)" barSize={20} />
              <Bar yAxisId="left" dataKey="desqualificados" stackId="a" fill="hsl(0, 65%, 55%)" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar yAxisId="left" dataKey="total" fill="hsl(210, 70%, 55%)" barSize={20} radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="taxaQualificacao" stroke="hsl(280, 60%, 55%)" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
