import { Users, UserCheck, CalendarCheck, CheckCircle2, DollarSign, Calendar, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
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

export function StrategicDashboardTab({ session, leads, stageCounts }: Props) {
  const { data: utmData = [] } = useUTMAnalytics(session.id);
  const { data: calComEvents = [] } = useCalComEvents();

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Filter Cal.com events for today
  const todayEvents = calComEvents.filter((e: any) => e.event_date === todayStr);

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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Reuniões do dia (Cal.com) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Reuniões de Hoje
              <Badge variant="outline" className="text-xs ml-auto">Cal.com</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma reunião hoje</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map((event: any, i: number) => {
                  const [h, m] = (event.event_time || "00:00").split(":").map(Number);
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

        {/* UTM Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fontes UTM</CardTitle>
          </CardHeader>
          <CardContent>
            {utmData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados de UTM ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={utmData}>
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="qualified" name="Qualificados" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
