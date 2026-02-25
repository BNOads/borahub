import { useState, useMemo } from "react";
import { Users, UserCheck, CalendarCheck, CheckCircle2, DollarSign, Calendar, Video, TrendingUp, Percent, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, FunnelChart, Funnel, LabelList } from "recharts";
import { useUTMAnalytics, StrategicSession, StrategicLead } from "@/hooks/useStrategicSession";
import { useCalComEvents } from "@/hooks/useCalComEvents";

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
            <Tooltip formatter={(val: number, name: string) => [val, name === "total" ? "Total" : name === "qualified" ? "Qualificados" : "Vendas"]} />
            <Bar dataKey="total" name="Total" fill={CHART_COLORS.total} radius={[0, 4, 4, 0]} barSize={14} />
            <Bar dataKey="qualified" name="Qualificados" fill={CHART_COLORS.qualified} radius={[0, 4, 4, 0]} barSize={14} />
            <Bar dataKey="vendas" name="Vendas" fill={CHART_COLORS.vendas} radius={[0, 4, 4, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function StrategicDashboardTab({ session, leads, stageCounts }: Props) {
  const { data: analytics } = useUTMAnalytics(session.id);
  const { data: calComEvents = [] } = useCalComEvents();
  const [meetingFilter, setMeetingFilter] = useState<MeetingFilter>("hoje");

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

  // Conversion rates
  const totalLeads = utmData?.total || 0;
  const qualifiedCount = utmData?.qualified || 0;
  const vendasCount = utmData?.vendas || 0;
  const qualRate = totalLeads > 0 ? ((qualifiedCount / totalLeads) * 100).toFixed(1) : "0";
  const convRate = totalLeads > 0 ? ((vendasCount / totalLeads) * 100).toFixed(1) : "0";

  // Pie chart for source distribution
  const sourcePie = (utmData?.bySource || []).filter(s => s.name !== "Sem dados").slice(0, 8);

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpiCards.map(kpi => (
          <Card key={kpi.key}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                <span className="text-2xl font-bold">{stageCounts[kpi.key] || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Top conversion table */}
      {utmData?.bySource && utmData.bySource.filter(s => s.name !== "Sem dados").length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Taxa de Conversão por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Origem</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Leads</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Qualificados</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Vendas</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Conv. %</th>
                  </tr>
                </thead>
                <tbody>
                  {utmData.bySource.filter(s => s.name !== "Sem dados").map(s => (
                    <tr key={s.name} className="border-b last:border-0">
                      <td className="py-2 font-medium">{s.name}</td>
                      <td className="py-2 text-right">{s.total}</td>
                      <td className="py-2 text-right">{s.qualified}</td>
                      <td className="py-2 text-right">{s.vendas}</td>
                      <td className="py-2 text-right">
                        <Badge variant={s.convPercent > 0 ? "default" : "outline"} className="text-xs">
                          {s.convPercent}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
