import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStrategicSession, useStrategicLeads } from "@/hooks/useStrategicSession";
import { StrategicDashboardTab } from "@/components/strategic/DashboardTab";
import { StrategicCRMTab } from "@/components/strategic/CRMTab";
import { StrategicReportsTab } from "@/components/strategic/ReportsTab";
import { StrategicConfigTab } from "@/components/strategic/ConfigTab";

export default function SessaoEstrategicaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isLoading } = useStrategicSession(id);
  const { data: leads = [] } = useStrategicLeads(id);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!session) {
    return <div className="text-center py-12 text-muted-foreground">Sessão não encontrada</div>;
  }

  const stageCounts = {
    lead: leads.filter(l => l.stage === 'lead').length,
    qualificado: leads.filter(l => l.stage === 'qualificado').length,
    agendado: leads.filter(l => l.stage === 'agendado').length,
    realizado: leads.filter(l => l.stage === 'realizado').length,
    venda: leads.filter(l => l.stage === 'venda').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{session.name}</h1>
        {session.description && <p className="text-muted-foreground text-sm mt-1">{session.description}</p>}
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <StrategicDashboardTab session={session} leads={leads} stageCounts={stageCounts} />
        </TabsContent>
        <TabsContent value="crm">
          <StrategicCRMTab sessionId={session.id} leads={leads} />
        </TabsContent>
        <TabsContent value="relatorios">
          <StrategicReportsTab sessionId={session.id} />
        </TabsContent>
        <TabsContent value="config">
          <StrategicConfigTab session={session} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
