import { useState, useMemo } from "react";
import { Users, UserCheck, CalendarCheck, CheckCircle2, DollarSign, Calendar, Video, TrendingUp, Percent, BarChart3, CalendarClock, CalendarCheck2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, ComposedChart } from "recharts";
import { useUTMAnalytics, StrategicSession, StrategicLead } from "@/hooks/useStrategicSession";
import { computeLeadScore } from "@/lib/leadScoring";
import { useCalComEvents, useCalComPastEvents, matchLeadsWithCalCom } from "@/hooks/useCalComEvents";

interface Props {
  session: StrategicSession;
  leads: StrategicLead[];
  stageCounts: Record<string, number>;
}

const kpiCards = [
  { key: "lead", label: "Leads", icon: Users, color: "text-blue-500" },
  { key: "qualificado", label: "Qualificados", icon: UserCheck, color: "text-purple-500" },
  { key: "agendado", label: "Agendados", icon: CalendarCheck, color: "text-orange-500" },
  { key: "realizado", label: "Realizados", icon: CheckCircle2, color: "text-emerald-500" },
  { key: "venda", label: "Vendas", icon: DollarSign, color: "text-green-600" },
];

type MeetingFilter = "hoje" | "amanha" | "7dias";

const filterLabels: Record<MeetingFilter, string> = {
  hoje: "Hoje",
  amanha: "Amanhã",
  "7dias": "Próx. 7 dias",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(35, 80%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(350, 65%, 55%)",
  "hsl(190, 60%, 50%)",
];

const CHART_COLORS = {
  total: "hsl(210, 70%, 55%)",
  qualified: "hsl(280, 60%, 55%)",
  vendas: "hsl(145, 60%, 45%)",
};

function UTMBarChart({ data, title }: { data: { name: string; total: number; qualified: number; vendas: number; convPercent: number }[]; title: string }) {
  const filtered = data.filter(d => d.name !== "Sem dados").slice(0, 10);
  if (filtered.length === 0) return <p className="text-sm text-muted-foreground py-4">Sem dados disponíveis</p>;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(180, filtered.length * 32)}>
          <BarChart data={filtered} layout="vertical" margin={{ left: 10, right: 10 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(val: number, name: string) => [val, name === "total" ? "Total" : "Qualificados"]} />
            <Bar dataKey="total" name="Total" fill={CHART_COLORS.total} radius={[0, 4, 4, 0]} barSize={14} />
            <Bar dataKey="qualified" name="Qualificados" fill={CHART_COLORS.qualified} radius={[0, 4, 4, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

type SortKey = "name" | "total" | "qualified" | "vendas" | "qualPercent";
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

  // Find min/max qualPercent for color scale
  const allQualPercents = withQualPercent.map(s => s.qualPercent);
  const minQual = Math.min(...allQualPercents);
  const maxQual = Math.max(...allQualPercents);

  const getQualColor = (val: number) => {
    if (maxQual === minQual) return "hsl(210, 15%, 95%)";
    const ratio = (val - minQual) / (maxQual - minQual);
    // Red (0) -> Yellow (0.5) -> Green (1)
    const hue = Math.round(ratio * 120); // 0=red, 60=yellow, 120=green
    return `hsl(${hue}, 65%, 90%)`;
  };

  const getQualTextColor = (val: number) => {
    if (maxQual === minQual) return "hsl(210, 15%, 30%)";
    const ratio = (val - minQual) / (maxQual - minQual);
    const hue = Math.round(ratio * 120);
    return `hsl(${hue}, 70%, 30%)`;
  };

  const sorted = [...withQualPercent].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
    setPage(0);
  };

  const arrow = (key: SortKey) => sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
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
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: getQualColor(s.qualPercent), color: getQualTextColor(s.qualPercent) }}
                    >
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
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StrategicDashboardTab({ session, leads, stageCounts }: Props) {
  const { data: analytics } = useUTMAnalytics(session.id);
  const { data: calComEvents = [] } = useCalComEvents();
  const { data: calComPastEvents = [] } = useCalComPastEvents();
  const [meetingFilter, setMeetingFilter] = useState<MeetingFilter>("hoje");
  const [chartStartDate, setChartStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
  });
  const [chartEndDate, setChartEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const calComMatches = useMemo(() => matchLeadsWithCalCom(leads, calComEvents, calComPastEvents), [leads, calComEvents, calComPastEvents]);
  // Agendados = leads that have ANY Cal.com match (upcoming or past)
  const agendadosByCalCom = useMemo(() => [...calComMatches.values()].filter(m => m.hasUpcoming || m.hasPast).length, [calComMatches]);
  const realizadosByCalCom = useMemo(() => [...calComMatches.values()].filter(m => m.hasPast).length, [calComMatches]);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const utmData = analytics as {
    bySource: any[]; byMedium: any[]; byCampaign: any[]; byContent: any[]; byTerm: any[];
    funnel: { name: string; value: number }[];
    daily: { date: string; leads: number }[];
    total: number; qualified: number; vendas: number;
  } | undefined;

  const filteredEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in7days = new Date(today);
    in7days.setDate(in7days.getDate() + 7);

    return calComEvents.filter((e: any) => {
      const eventDate = new Date(e.event_date + "T00:00:00");
      switch (meetingFilter) {
        case "hoje": return e.event_date === todayStr;
        case "amanha": return e.event_date === tomorrow.toISOString().split("T")[0];
        case "7dias": return eventDate >= today && eventDate < in7days;
        default: return false;
      }
    });
  }, [calComEvents, meetingFilter, todayStr]);

  const qualifiedByScoring = useMemo(() => leads.filter(l => computeLeadScore(l).isQualified).length, [leads]);

  // Conversion rates - use leads.length as base for scheduling rate
  const totalLeads = leads.length;
  const qualifiedCount = qualifiedByScoring;
  const vendasCount = utmData?.vendas || 0;
  const qualRate = totalLeads > 0 ? ((qualifiedCount / totalLeads) * 100).toFixed(1) : "0";
  const convRate = totalLeads > 0 ? ((vendasCount / totalLeads) * 100).toFixed(1) : "0";
  const scheduleRate = totalLeads > 0 ? ((agendadosByCalCom / totalLeads) * 100).toFixed(1) : "0";
  const completionRate = agendadosByCalCom > 0 ? ((realizadosByCalCom / agendadosByCalCom) * 100).toFixed(1) : "0";

  // Pie chart for source distribution
  const sourcePie = (utmData?.bySource || []).filter(s => s.name !== "Sem dados").slice(0, 8);

  // Daily meeting metrics chart
  const dailyMeetingData = useMemo(() => {
    const dateMap = new Map<string, { date: string; agendados: number; realizados: number }>();

    for (const ev of calComEvents) {
      if (ev.event_date >= chartStartDate && ev.event_date <= chartEndDate) {
        if (!dateMap.has(ev.event_date)) dateMap.set(ev.event_date, { date: ev.event_date, agendados: 0, realizados: 0 });
        dateMap.get(ev.event_date)!.agendados++;
      }
    }

    for (const ev of calComPastEvents) {
      if (ev.event_date >= chartStartDate && ev.event_date <= chartEndDate) {
        if (!dateMap.has(ev.event_date)) dateMap.set(ev.event_date, { date: ev.event_date, agendados: 0, realizados: 0 });
        dateMap.get(ev.event_date)!.realizados++;
      }
    }

    return [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date)).map(d => {
      const [, mm, dd] = d.date.split("-");
      return {
        ...d,
        date: `${dd}/${mm}`,
        taxaRealizacao: d.agendados > 0 ? Math.round((d.realizados / d.agendados) * 100) : 0,
      };
    });
  }, [calComEvents, calComPastEvents, chartStartDate, chartEndDate]);

  // Daily leads chart with qualified/unqualified
  const dailyLeadsData = useMemo(() => {
    const dateMap = new Map<string, { date: string; qualificados: number; desqualificados: number; total: number }>();
    for (const lead of leads) {
      // Use extra_data.data (actual lead capture date) if available, fallback to created_at
      const rawDate = (lead.extra_data as Record<string, string> | null)?.data || lead.created_at;
      if (!rawDate) continue;
      // Parse ISO or date-only string to YYYY-MM-DD
      const date = rawDate.length >= 10 ? rawDate.substring(0, 10) : rawDate;
      if (date < chartStartDate || date > chartEndDate) continue;
      if (!dateMap.has(date)) dateMap.set(date, { date, qualificados: 0, desqualificados: 0, total: 0 });
      const entry = dateMap.get(date)!;
      entry.total++;
      if (computeLeadScore(lead).isQualified) {
        entry.qualificados++;
      } else {
        entry.desqualificados++;
      }
    }
    return [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date)).map(d => {
      const [, mm, dd] = d.date.split("-");
      return {
        ...d,
        date: `${dd}/${mm}`,
        taxaQualificacao: d.total > 0 ? Math.round((d.qualificados / d.total) * 100) : 0,
      };
    });
  }, [leads, chartStartDate, chartEndDate]);

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpiCards.map(kpi => (
          <Card key={kpi.key}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                <span className="text-2xl font-bold">
                  {kpi.key === "qualificado" ? qualifiedByScoring
                    : kpi.key === "agendado" ? agendadosByCalCom
                    : kpi.key === "realizado" ? realizadosByCalCom
                    : (stageCounts[kpi.key] || 0)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion & meeting metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total de Leads</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Taxa Qualificação</span>
            </div>
            <p className="text-2xl font-bold mt-1">{qualRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Taxa Agendamento</span>
            </div>
            <p className="text-2xl font-bold mt-1">{scheduleRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Taxa Realização</span>
            </div>
            <p className="text-2xl font-bold mt-1">{completionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Taxa Conversão</span>
            </div>
            <p className="text-2xl font-bold mt-1">{convRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Vendas</span>
            </div>
            <p className="text-2xl font-bold mt-1">{vendasCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily leads chart - qualified vs unqualified */}
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

      {/* Daily meetings chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Reuniões por Dia</CardTitle>
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
          {dailyMeetingData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Sem dados de reuniões no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyMeetingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    name === "taxaRealizacao" ? `${val}%` : val,
                    name === "agendados" ? "Agendados" : name === "realizados" ? "Realizados" : "Taxa Realização"
                  ]}
                />
                <Legend formatter={(value) => value === "agendados" ? "Agendados" : value === "realizados" ? "Realizados" : "Taxa Realização %"} />
                <Bar dataKey="agendados" fill="hsl(35, 80%, 55%)" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="realizados" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} barSize={16} />
                <Line type="monotone" dataKey="taxaRealizacao" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} yAxisId={0} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Reuniões do dia (Cal.com) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Reuniões
              <div className="flex gap-1 ml-auto">
                {(Object.keys(filterLabels) as MeetingFilter[]).map(f => (
                  <Badge
                    key={f}
                    variant={meetingFilter === f ? "default" : "outline"}
                    className="text-xs cursor-pointer"
                    onClick={() => setMeetingFilter(f)}
                  >
                    {filterLabels[f]}
                  </Badge>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma reunião {filterLabels[meetingFilter].toLowerCase()}</p>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map((event: any, i: number) => {
                  const start = new Date(event.event_date + "T" + (event.event_time || "00:00:00"));
                  const end = new Date(start.getTime() + (event.duration_minutes || 30) * 60000);
                  const isNow = now >= start && now <= end;
                  return (
                    <div key={event.id || i} className={`flex items-center justify-between p-2 rounded-md border ${isNow ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div className="flex items-center gap-2">
                        {isNow && <Video className="h-4 w-4 text-primary animate-pulse" />}
                        <div>
                          <p className="text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      {isNow && <Badge className="bg-primary text-primary-foreground text-xs">Ao vivo</Badge>}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por Origem (Pie) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            {sourcePie.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Sem dados de origem</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={sourcePie} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                      {sourcePie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => [val, "Leads"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {sourcePie.map((s, i) => (
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

      {/* Leads over time */}
      {utmData?.daily && utmData.daily.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Leads ao longo do tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={utmData.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Funil de conversão */}
      {utmData?.funnel && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={utmData.funnel} margin={{ left: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                  {utmData.funnel.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* UTM breakdown charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {utmData?.bySource && <UTMBarChart data={utmData.bySource} title="Por Origem (Source)" />}
        {utmData?.byMedium && <UTMBarChart data={utmData.byMedium} title="Por Público (Medium)" />}
        {utmData?.byCampaign && <UTMBarChart data={utmData.byCampaign} title="Por Campanha" />}
        {utmData?.byContent && <UTMBarChart data={utmData.byContent} title="Por Criativo (Content)" />}
        {utmData?.byTerm && <UTMBarChart data={utmData.byTerm} title="Por Tráfego (Term)" />}
      </div>

      {/* UTM sortable tables */}
      <div className="grid md:grid-cols-2 gap-6">
        {utmData?.bySource && <SortableUTMTable data={utmData.bySource} title="Taxa de Qualificação por Origem" label="Origem" />}
        {utmData?.byMedium && <SortableUTMTable data={utmData.byMedium} title="Taxa de Qualificação por Público" label="Público" />}
        {utmData?.byCampaign && <SortableUTMTable data={utmData.byCampaign} title="Taxa de Qualificação por Campanha" label="Campanha" />}
        {utmData?.byContent && <SortableUTMTable data={utmData.byContent} title="Taxa de Qualificação por Criativo" label="Criativo" />}
        {utmData?.byTerm && <SortableUTMTable data={utmData.byTerm} title="Taxa de Qualificação por Tráfego" label="Tráfego" />}
      </div>
    </div>
  );
}
