import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Save, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useFunnelDailyReports, useTodayReport, useCreateDailyReport, useUpdateFunnelResponsible } from "@/hooks/useFunnelDailyReports";
import { useQuery } from "@tanstack/react-query";
import { FunnelData } from "./types";

interface FunnelDailyReportProps {
  funnel: FunnelData;
  onUpdate: () => void;
}

export function FunnelDailyReport({ funnel, onUpdate }: FunnelDailyReportProps) {
  const today = new Date().toISOString().split("T")[0];
  const { data: reports, isLoading: loadingReports } = useFunnelDailyReports(funnel.id);
  const { data: todayReport } = useTodayReport(funnel.id);
  const createReport = useCreateDailyReport();
  const updateResponsible = useUpdateFunnelResponsible();

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

  // Load today's report data if exists
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

  // Fetch users for responsible selector
  const { data: users } = useQuery({
    queryKey: ["users-for-responsible"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createReport.mutateAsync({
      funnel_id: funnel.id,
      funnel_name: funnel.name,
      report_date: today,
      ...formData,
    });
  };

  const handleResponsibleChange = async (userId: string) => {
    await updateResponsible.mutateAsync({
      funnelId: funnel.id,
      userId: userId === "none" ? null : userId,
    });
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Responsável */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Responsável pelo Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={(funnel as any).responsible_user_id || "none"}
            onValueChange={handleResponsibleChange}
          >
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Selecionar responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum responsável</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Formulário do dia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Relatório do Dia ({format(new Date(), "dd/MM/yyyy", { locale: ptBR })})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                rows={3}
              />
            </div>

            <Button type="submit" disabled={createReport.isPending} className="w-full md:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {todayReport ? "Atualizar Relatório" : "Salvar Relatório"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Histórico de Relatórios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingReports ? (
            <div className="text-center py-4 text-muted-foreground">Carregando...</div>
          ) : reports && reports.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-center">Contatos</TableHead>
                    <TableHead className="text-center">Follow-ups</TableHead>
                    <TableHead className="text-center">Reagend.</TableHead>
                    <TableHead className="text-center">Agendadas</TableHead>
                    <TableHead className="text-center">Realizadas</TableHead>
                    <TableHead className="text-center">No-show</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead>Resumo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(report.report_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center">{report.contacts}</TableCell>
                      <TableCell className="text-center">{report.followups}</TableCell>
                      <TableCell className="text-center">{report.reschedules}</TableCell>
                      <TableCell className="text-center">{report.meetings_scheduled}</TableCell>
                      <TableCell className="text-center">{report.meetings_held}</TableCell>
                      <TableCell className="text-center">{report.no_shows}</TableCell>
                      <TableCell className="text-center">{report.sales}</TableCell>
                      <TableCell className="max-w-xs truncate">{report.summary || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum relatório registrado ainda
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
