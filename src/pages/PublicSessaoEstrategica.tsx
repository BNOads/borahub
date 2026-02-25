import { useParams } from "react-router-dom";
import { Users, UserCheck, CalendarCheck, CheckCircle2, DollarSign, ExternalLink, Calendar, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePublicSession, usePublicLeads, usePublicDailyReports, usePublicLinks, useGoogleCalendarEvents } from "@/hooks/useStrategicSession";

export default function PublicSessaoEstrategica() {
  const { slug } = useParams<{ slug: string }>();
  const { data: session, isLoading } = usePublicSession(slug);
  const { data: leads = [] } = usePublicLeads(session?.id);
  const { data: reports = [] } = usePublicDailyReports(session?.id);
  const { data: links = [] } = usePublicLinks(session?.id);
  const { data: calendarEvents = [] } = useGoogleCalendarEvents(session?.google_calendar_id);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!session) return <div className="text-center py-20 text-muted-foreground">Sessão não encontrada</div>;

  const stageCounts = {
    lead: leads.filter((l: any) => l.stage === "lead").length,
    qualificado: leads.filter((l: any) => l.stage === "qualificado").length,
    agendado: leads.filter((l: any) => l.stage === "agendado").length,
    realizado: leads.filter((l: any) => l.stage === "realizado").length,
    venda: leads.filter((l: any) => l.stage === "venda").length,
  };

  const kpis = [
    { key: "lead", label: "Leads", icon: Users, color: "text-blue-500" },
    { key: "qualificado", label: "Qualificados", icon: UserCheck, color: "text-purple-500" },
    { key: "agendado", label: "Agendados", icon: CalendarCheck, color: "text-orange-500" },
    { key: "realizado", label: "Realizados", icon: CheckCircle2, color: "text-emerald-500" },
    { key: "venda", label: "Vendas", icon: DollarSign, color: "text-green-600" },
  ];

  const now = new Date();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{session.name}</h1>
        {session.description && <p className="text-muted-foreground mt-1">{session.description}</p>}
      </div>

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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
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

        {/* Links */}
        {links.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Links Úteis</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {links.map((link: any) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-md border hover:bg-muted transition-colors">
                  <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm">{link.name}</span>
                </a>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Latest reports */}
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
