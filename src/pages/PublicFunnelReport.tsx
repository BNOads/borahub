import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Save, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function PublicFunnelReport() {
  const { id: funnelId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    contacts: 0,
    followups: 0,
    reschedules: 0,
    meetings_scheduled: 0,
    meetings_held: 0,
    no_shows: 0,
    sales: 0,
    summary: "",
  });
  const [submitted, setSubmitted] = useState(false);

  // Fetch funnel info
  const { data: funnel, isLoading: loadingFunnel, error: funnelError } = useQuery({
    queryKey: ["public-funnel", funnelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnels")
        .select("id, name, code, category")
        .eq("id", funnelId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!funnelId,
  });

  // Check if today's report already exists
  const { data: todayReport } = useQuery({
    queryKey: ["public-today-report", funnelId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_daily_reports")
        .select("*")
        .eq("funnel_id", funnelId)
        .eq("report_date", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!funnelId,
  });

  // Load existing report data
  useEffect(() => {
    if (todayReport) {
      setFormData({
        contacts: todayReport.contacts,
        followups: todayReport.followups,
        reschedules: todayReport.reschedules,
        meetings_scheduled: todayReport.meetings_scheduled,
        meetings_held: todayReport.meetings_held,
        no_shows: todayReport.no_shows,
        sales: todayReport.sales,
        summary: todayReport.summary || "",
      });
    }
  }, [todayReport]);

  // Create/update report mutation
  const createReport = useMutation({
    mutationFn: async (data: typeof formData) => {
      const reportData = {
        funnel_id: funnelId!,
        report_date: today,
        ...data,
      };

      if (todayReport) {
        const { error } = await supabase
          .from("funnel_daily_reports")
          .update(reportData)
          .eq("id", todayReport.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("funnel_daily_reports")
          .insert(reportData);
        if (error) throw error;
      }

      // Call webhook
      try {
        await supabase.functions.invoke("funnel-daily-report-webhook", {
          body: {
            ...reportData,
            funnel_name: funnel?.name,
          },
        });
      } catch (webhookError) {
        console.error("Webhook error:", webhookError);
      }
    },
    onSuccess: () => {
      toast.success("Relatório salvo com sucesso!");
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["public-today-report", funnelId] });
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar relatório: " + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createReport.mutateAsync(formData);
  };

  if (loadingFunnel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (funnelError || !funnel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">Funil não encontrado ou link inválido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (funnel.category !== "High ticket") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Este funil não requer relatório diário.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold">Relatório Enviado!</h2>
            <p className="text-muted-foreground">
              O relatório de hoje para <strong>{funnel.name}</strong> foi salvo com sucesso.
            </p>
            <Button variant="outline" onClick={() => setSubmitted(false)}>
              Editar Relatório
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Relatório Diário - {funnel.name}
              {funnel.code && <span className="text-muted-foreground">| {funnel.code}</span>}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contacts">Contatos</Label>
                  <Input
                    id="contacts"
                    type="number"
                    min="0"
                    value={formData.contacts}
                    onChange={(e) => setFormData({ ...formData, contacts: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followups">Follow-ups</Label>
                  <Input
                    id="followups"
                    type="number"
                    min="0"
                    value={formData.followups}
                    onChange={(e) => setFormData({ ...formData, followups: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reschedules">Reagendamentos</Label>
                  <Input
                    id="reschedules"
                    type="number"
                    min="0"
                    value={formData.reschedules}
                    onChange={(e) => setFormData({ ...formData, reschedules: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetings_scheduled">Reuniões Agendadas</Label>
                  <Input
                    id="meetings_scheduled"
                    type="number"
                    min="0"
                    value={formData.meetings_scheduled}
                    onChange={(e) => setFormData({ ...formData, meetings_scheduled: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetings_held">Reuniões Realizadas</Label>
                  <Input
                    id="meetings_held"
                    type="number"
                    min="0"
                    value={formData.meetings_held}
                    onChange={(e) => setFormData({ ...formData, meetings_held: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="no_shows">No-shows</Label>
                  <Input
                    id="no_shows"
                    type="number"
                    min="0"
                    value={formData.no_shows}
                    onChange={(e) => setFormData({ ...formData, no_shows: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sales">Vendas</Label>
                  <Input
                    id="sales"
                    type="number"
                    min="0"
                    value={formData.sales}
                    onChange={(e) => setFormData({ ...formData, sales: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Resumo do Dia</Label>
                <Textarea
                  id="summary"
                  placeholder="Descreva as principais atividades e observações do dia..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={createReport.isPending} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {todayReport ? "Atualizar Relatório" : "Salvar Relatório"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
