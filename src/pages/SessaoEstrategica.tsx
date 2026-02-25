import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Crosshair, ExternalLink, Loader2, Users, UserCheck, CalendarCheck, CheckCircle2, DollarSign, Calendar, Video, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStrategicSessions, useCreateSession, useStrategicLeads } from "@/hooks/useStrategicSession";
import { useCalComEvents } from "@/hooks/useCalComEvents";
import { cn } from "@/lib/utils";

const kpiCards = [
  { key: "lead", label: "Leads", icon: Users, color: "text-blue-500" },
  { key: "qualificado", label: "Qualificados", icon: UserCheck, color: "text-purple-500" },
  { key: "agendado", label: "Agendados", icon: CalendarCheck, color: "text-orange-500" },
  { key: "realizado", label: "Realizados", icon: CheckCircle2, color: "text-emerald-500" },
  { key: "venda", label: "Vendas", icon: DollarSign, color: "text-green-600" },
];

const stageLabels: Record<string, string> = {
  lead: "Lead",
  qualificado: "Qualificado",
  agendado: "Agendado",
  realizado: "Realizado",
  venda: "Venda",
};

const stageColors: Record<string, string> = {
  lead: "bg-blue-500",
  qualificado: "bg-purple-500",
  agendado: "bg-orange-500",
  realizado: "bg-emerald-500",
  venda: "bg-green-600",
};

export default function SessaoEstrategica() {
  const navigate = useNavigate();
  const { data: sessions = [], isLoading } = useStrategicSessions();
  const createSession = useCreateSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Get first active session's leads for KPIs/CRM overview
  const activeSession = sessions.find(s => s.status === 'active') || sessions[0];
  const { data: leads = [] } = useStrategicLeads(activeSession?.id);

  // Cal.com events
  const { data: calComEvents = [] } = useCalComEvents();

  const today = new Date().toISOString().split("T")[0];
  const todayEvents = useMemo(() => 
    calComEvents.filter(e => e.event_date === today).sort((a, b) => a.event_time.localeCompare(b.event_time)),
    [calComEvents, today]
  );
  const upcomingEvents = useMemo(() =>
    calComEvents.filter(e => e.event_date > today).sort((a, b) => {
      const d = a.event_date.localeCompare(b.event_date);
      return d !== 0 ? d : a.event_time.localeCompare(b.event_time);
    }).slice(0, 5),
    [calComEvents, today]
  );

  const stageCounts = useMemo(() => ({
    lead: leads.filter(l => l.stage === 'lead').length,
    qualificado: leads.filter(l => l.stage === 'qualificado').length,
    agendado: leads.filter(l => l.stage === 'agendado').length,
    realizado: leads.filter(l => l.stage === 'realizado').length,
    venda: leads.filter(l => l.stage === 'venda').length,
  }), [leads]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const result = await createSession.mutateAsync({ name, description });
    setOpen(false);
    setName("");
    setDescription("");
    if (result) navigate(`/sessao-estrategica/${result.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crosshair className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Sessões Estratégicas</h1>
            <p className="text-muted-foreground text-sm">Gerencie funis de sessão estratégica</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Sessão</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Sessão Estratégica</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Sessão Estratégica MBA 2026" />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o objetivo da sessão..." />
              </div>
              <Button onClick={handleCreate} disabled={!name.trim() || createSession.isPending} className="w-full">
                {createSession.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Sessão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          {activeSession && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                KPIs — {activeSession.name}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {kpiCards.map(kpi => (
                  <Card key={kpi.key} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate(`/sessao-estrategica/${activeSession.id}`)}>
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
            </div>
          )}

          {/* Cal.com Meetings + CRM Mini */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Reuniões Cal.com */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Reuniões Cal.com
                  <Badge className="text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30 ml-auto" variant="outline">
                    {todayEvents.length} hoje
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayEvents.length === 0 && upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma reunião agendada</p>
                ) : (
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {todayEvents.length > 0 && (
                        <p className="text-xs font-medium text-muted-foreground">Hoje</p>
                      )}
                      {todayEvents.map(event => {
                        const now = new Date();
                        const startTime = new Date(`${event.event_date}T${event.event_time}`);
                        const endTime = new Date(startTime.getTime() + (event.duration_minutes || 60) * 60000);
                        const isNow = now >= startTime && now <= endTime;
                        return (
                          <div key={event.id} className={cn("flex items-center justify-between p-2.5 rounded-lg border", isNow ? "border-orange-500 bg-orange-500/5" : "border-border")}>
                            <div className="flex items-center gap-2.5">
                              {isNow && <Video className="h-4 w-4 text-orange-500 animate-pulse" />}
                              <div>
                                <p className="text-sm font-medium">{event.title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  {event.event_time.slice(0, 5)}
                                  {event.duration_minutes && <span>({event.duration_minutes}min)</span>}
                                </div>
                                {(event as any).participants?.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {(event as any).participants.join(", ")}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isNow && <Badge className="bg-orange-500 text-white text-xs">Ao vivo</Badge>}
                          </div>
                        );
                      })}

                      {upcomingEvents.length > 0 && (
                        <p className="text-xs font-medium text-muted-foreground mt-3">Próximas</p>
                      )}
                      {upcomingEvents.map(event => (
                        <div key={event.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                          <div>
                            <p className="text-sm font-medium">{event.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Calendar className="h-3 w-3" />
                              {new Date(event.event_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                              <Clock className="h-3 w-3" />
                              {event.event_time.slice(0, 5)}
                            </div>
                            {(event as any).participants?.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">{(event as any).participants.join(", ")}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* CRM Mini Overview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    CRM Pipeline
                  </CardTitle>
                  {activeSession && (
                    <Button variant="outline" size="sm" onClick={() => navigate(`/sessao-estrategica/${activeSession.id}`)}>
                      Ver completo
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!activeSession ? (
                  <p className="text-sm text-muted-foreground">Crie uma sessão para ver o CRM</p>
                ) : leads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum lead no pipeline</p>
                ) : (
                  <div className="space-y-3">
                    {/* Pipeline bars */}
                    {["lead", "qualificado", "agendado", "realizado", "venda"].map(stage => {
                      const count = stageCounts[stage] || 0;
                      const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
                      return (
                        <div key={stage} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-2 h-2 rounded-full", stageColors[stage])} />
                              <span>{stageLabels[stage]}</span>
                            </div>
                            <span className="font-medium">{count}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", stageColors[stage])} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}

                    {/* Recent leads */}
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Leads recentes</p>
                      <div className="space-y-1.5">
                        {leads.slice(0, 5).map(lead => (
                          <div key={lead.id} className="flex items-center justify-between text-sm py-1">
                            <span className="truncate">{lead.name}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">{stageLabels[lead.stage]}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sessions list */}
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Crosshair className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhuma sessão ainda</p>
                <p className="text-sm">Crie sua primeira sessão estratégica para começar</p>
              </CardContent>
            </Card>
          ) : (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Sessões</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map(session => (
                  <Card key={session.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/sessao-estrategica/${session.id}`)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{session.name}</CardTitle>
                        <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                          {session.status === 'active' ? 'Ativa' : 'Finalizada'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {session.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{session.description}</p>}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {session.public_slug && (
                          <span className="flex items-center gap-1"><ExternalLink className="h-3 w-3" />Link público</span>
                        )}
                        <span>Criado em {new Date(session.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
