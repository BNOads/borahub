import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Eye,
  Play,
  CheckCircle2,
  Users,
  Clock,
  TrendingUp,
  Download,
  ExternalLink,
  BarChart3,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuiz, useQuizAnalytics } from "@/hooks/useQuizzes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function QuizAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quiz, isLoading: quizLoading } = useQuiz(id);
  const { data: analytics, isLoading: analyticsLoading } = useQuizAnalytics(id);

  const isLoading = quizLoading || analyticsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="p-6 text-center">
        <p>Quiz não encontrado</p>
        <Button onClick={() => navigate("/quizzes")} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const sessions = analytics?.sessions || [];
  const leads = analytics?.leads || [];

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const startRate = quiz.views_count > 0 ? (quiz.starts_count / quiz.views_count) * 100 : 0;
  const completionRate = quiz.starts_count > 0 ? (quiz.completions_count / quiz.starts_count) * 100 : 0;
  const optInRate = quiz.completions_count > 0 ? (quiz.leads_count / quiz.completions_count) * 100 : 0;

  // Group sessions by day for chart
  const sessionsByDay = sessions.reduce((acc: Record<string, number>, session) => {
    const day = format(new Date(session.started_at), "dd/MM");
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(sessionsByDay).map(([day, count]) => ({
    day,
    sessions: count,
  }));

  // Diagnosis distribution
  const diagnosisDistribution = quiz.diagnoses?.map((diagnosis) => {
    const count = completedSessions.filter((s) => s.diagnosis_id === diagnosis.id).length;
    return {
      name: diagnosis.title,
      value: count,
      color: diagnosis.color,
    };
  }) || [];

  // Export leads to CSV
  const exportLeads = () => {
    const headers = ["Nome", "Email", "WhatsApp", "Empresa", "Data"];
    const rows = leads.map((lead) => [
      lead.name || "",
      lead.email || "",
      lead.whatsapp || "",
      lead.company || "",
      format(new Date(lead.created_at), "dd/MM/yyyy HH:mm"),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${quiz.slug}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quizzes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <p className="text-muted-foreground">Analytics e métricas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.open(`/q/${quiz.slug}`, "_blank")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Quiz
          </Button>
          <Button variant="outline" onClick={exportLeads}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Leads
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quiz.views_count.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Visualizações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Play className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quiz.starts_count.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Iniciados ({startRate.toFixed(1)}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quiz.completions_count.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Concluídos ({completionRate.toFixed(1)}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quiz.leads_count.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Leads ({optInRate.toFixed(1)}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Funil de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Visualizações → Inícios</span>
                <span className="font-medium">{startRate.toFixed(1)}%</span>
              </div>
              <Progress value={startRate} className="h-3" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Inícios → Conclusões</span>
                <span className="font-medium">{completionRate.toFixed(1)}%</span>
              </div>
              <Progress value={completionRate} className="h-3" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Conclusões → Leads</span>
                <span className="font-medium">{optInRate.toFixed(1)}%</span>
              </div>
              <Progress value={optInRate} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <Users className="h-4 w-4" />
            Leads ({leads.length})
          </TabsTrigger>
          <TabsTrigger value="diagnoses" className="gap-2">
            <PieChart className="h-4 w-4" />
            Diagnósticos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Sessions Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Sessões por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="sessions" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Device Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Dispositivos</CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length > 0 ? (
                  <div className="space-y-4">
                    {["mobile", "desktop"].map((device) => {
                      const count = sessions.filter((s) => s.device_type === device).length;
                      const percentage = (count / sessions.length) * 100;
                      return (
                        <div key={device} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{device}</span>
                            <span>{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Leads Capturados</CardTitle>
              <CardDescription>
                Lista de todos os leads que preencheram o formulário
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leads.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name || "-"}</TableCell>
                        <TableCell>{lead.email || "-"}</TableCell>
                        <TableCell>{lead.whatsapp || "-"}</TableCell>
                        <TableCell>{lead.company || "-"}</TableCell>
                        <TableCell>
                          {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  Nenhum lead capturado ainda
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnoses">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Diagnosis Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Diagnósticos</CardTitle>
              </CardHeader>
              <CardContent>
                {diagnosisDistribution.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={diagnosisDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {diagnosisDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum diagnóstico gerado ainda
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Diagnosis List */}
            <Card>
              <CardHeader>
                <CardTitle>Diagnósticos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {diagnosisDistribution.map((diagnosis, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: diagnosis.color || COLORS[index] }}
                        />
                        <span className="font-medium">{diagnosis.name}</span>
                      </div>
                      <Badge variant="secondary">{diagnosis.value} respostas</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
