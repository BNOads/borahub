import { useState } from "react";
import { format } from "date-fns";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useStrategicDailyReports, useCreateDailyReport } from "@/hooks/useStrategicSession";

interface Props {
  sessionId: string;
}

export function StrategicReportsTab({ sessionId }: Props) {
  const { data: reports = [], isLoading } = useStrategicDailyReports(sessionId);
  const createReport = useCreateDailyReport();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    report_date: format(new Date(), "yyyy-MM-dd"),
    report_type: "sdr" as string,
    contacts: 0,
    followups: 0,
    meetings_scheduled: 0,
    meetings_held: 0,
    no_shows: 0,
    sales: 0,
    summary: "",
  });

  const handleSubmit = async () => {
    await createReport.mutateAsync({ ...form, session_id: sessionId });
    setOpen(false);
    setForm(prev => ({ ...prev, contacts: 0, followups: 0, meetings_scheduled: 0, meetings_held: 0, no_shows: 0, sales: 0, summary: "" }));
  };

  const sdrReports = reports.filter(r => r.report_type === "sdr");
  const closerReports = reports.filter(r => r.report_type === "closer");

  const ReportTable = ({ items, type }: { items: typeof reports; type: string }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{type === "sdr" ? "SDR" : "Closer"}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum relatório {type === "sdr" ? "SDR" : "Closer"} ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead className="text-center">Contatos</TableHead>
                  <TableHead className="text-center">Follow-ups</TableHead>
                  <TableHead className="text-center">Agendados</TableHead>
                  <TableHead className="text-center">Realizados</TableHead>
                  <TableHead className="text-center">No-show</TableHead>
                  <TableHead className="text-center">Vendas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.report_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{r.author_name}</TableCell>
                    <TableCell className="text-center">{r.contacts}</TableCell>
                    <TableCell className="text-center">{r.followups}</TableCell>
                    <TableCell className="text-center">{r.meetings_scheduled}</TableCell>
                    <TableCell className="text-center">{r.meetings_held}</TableCell>
                    <TableCell className="text-center">{r.no_shows}</TableCell>
                    <TableCell className="text-center">{r.sales}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Relatório</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Relatório Diário</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.report_date} onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.report_type} onValueChange={v => setForm(f => ({ ...f, report_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sdr">SDR</SelectItem>
                      <SelectItem value="closer">Closer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "contacts", label: "Contatos" },
                  { key: "followups", label: "Follow-ups" },
                  { key: "meetings_scheduled", label: "Agendados" },
                  { key: "meetings_held", label: "Realizados" },
                  { key: "no_shows", label: "No-show" },
                  { key: "sales", label: "Vendas" },
                ].map(field => (
                  <div key={field.key}>
                    <Label className="text-xs">{field.label}</Label>
                    <Input type="number" min={0} value={(form as any)[field.key]} onChange={e => setForm(f => ({ ...f, [field.key]: parseInt(e.target.value) || 0 }))} />
                  </div>
                ))}
              </div>
              <div>
                <Label>Resumo do dia</Label>
                <Textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Como foi o dia..." />
              </div>
              <Button onClick={handleSubmit} disabled={createReport.isPending} className="w-full">
                {createReport.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Relatório
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ReportTable items={sdrReports} type="sdr" />
      <ReportTable items={closerReports} type="closer" />
    </div>
  );
}
