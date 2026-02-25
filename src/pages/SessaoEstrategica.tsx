import { useState, useMemo, useEffect } from "react";
import { Plus, Crosshair, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStrategicSessions, useCreateSession, useStrategicLeads } from "@/hooks/useStrategicSession";
import { StrategicDashboardTab } from "@/components/strategic/DashboardTab";
import { StrategicCRMTab } from "@/components/strategic/CRMTab";
import { StrategicReportsTab } from "@/components/strategic/ReportsTab";
import { StrategicConfigTab } from "@/components/strategic/ConfigTab";

export default function SessaoEstrategica() {
  const { data: sessions = [], isLoading } = useStrategicSessions();
  const createSession = useCreateSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  // Auto-select first session
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const activeSession = sessions.find(s => s.id === selectedSessionId);
  const { data: leads = [] } = useStrategicLeads(activeSession?.id);

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
    if (result) setSelectedSessionId(result.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crosshair className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Sessões Estratégicas</h1>
            <p className="text-muted-foreground text-sm">Gerencie suas sessões estratégicas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sessions.length > 0 && (
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Selecione a sessão" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Crosshair className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhuma sessão ainda</p>
            <p className="text-sm">Crie sua primeira sessão estratégica para começar</p>
          </CardContent>
        </Card>
      ) : activeSession ? (
        <Tabs defaultValue="dashboard">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="crm">CRM</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <StrategicDashboardTab session={activeSession} leads={leads} stageCounts={stageCounts} />
          </TabsContent>
          <TabsContent value="crm">
            <StrategicCRMTab sessionId={activeSession.id} leads={leads} />
          </TabsContent>
          <TabsContent value="relatorios">
            <StrategicReportsTab sessionId={activeSession.id} />
          </TabsContent>
          <TabsContent value="config">
            <StrategicConfigTab session={activeSession} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
