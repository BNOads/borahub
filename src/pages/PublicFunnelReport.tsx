import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClipboardList, Save, CheckCircle, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const emptyForm = {
  contacts: 0,
  followups: 0,
  reschedules: 0,
  meetings_scheduled: 0,
  meetings_held: 0,
  no_shows: 0,
  sales: 0,
  summary: "",
};

export default function PublicFunnelReport() {
  const { id: funnelId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const [formData, setFormData] = useState(emptyForm);
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

  // Check if selected date's report already exists
  const { data: existingReport } = useQuery({
    queryKey: ["public-day-report", funnelId, selectedDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_daily_reports")
        .select("*")
        .eq("funnel_id", funnelId)
        .eq("report_date", selectedDateStr)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!funnelId,
  });

  // Load existing report data when date changes
  useEffect(() => {
    if (existingReport) {
      setFormData({
        contacts: existingReport.contacts,
        followups: existingReport.followups,
        reschedules: existingReport.reschedules,
        meetings_scheduled: existingReport.meetings_scheduled,
        meetings_held: existingReport.meetings_held,
        no_shows: existingReport.no_shows,
        sales: existingReport.sales,
        summary: existingReport.summary || "",
      });
    } else {
      setFormData(emptyForm);
    }
    setSubmitted(false);
  }, [existingReport, selectedDateStr]);

  // Create/update report mutation
  const createReport = useMutation({
    mutationFn: async (data: typeof formData) => {
      const reportData = {
        funnel_id: funnelId!,
        report_date: selectedDateStr,
        ...data,
      };

      if (existingReport) {
        const { error } = await supabase
          .from("funnel_daily_reports")
          .update(reportData)
          .eq("id", existingReport.id);
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
      queryClient.invalidateQueries({ queryKey: ["public-day-report", funnelId] });
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar relatório: " + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createReport.mutateAsync(formData);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setDatePickerOpen(false);
    }
  };

  const isToday = selectedDateStr === format(new Date(), "yyyy-MM-dd");

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
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h2 className="text-xl font-bold">Relatório Enviado!</h2>
            <p className="text-muted-foreground">
              O relatório de <strong>{format(selectedDate, "dd/MM/yyyy")}</strong> para{" "}
              <strong>{funnel.name}</strong> foi salvo com sucesso.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Editar Relatório
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDate(new Date());
                  setSubmitted(false);
                }}
              >
                Novo Relatório
              </Button>
            </div>
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

            {/* Date Picker */}
            <div className="flex items-center gap-3 pt-1">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal gap-2",
                      !isToday && "border-primary text-primary"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {isToday
                      ? `Hoje — ${format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}`
                      : format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              {!isToday && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Relatório retroativo
                </span>
              )}
              {existingReport && (
                <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">
                  Já enviado — editando
                </span>
              )}
            </div>
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
                {existingReport ? "Atualizar Relatório" : "Salvar Relatório"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
