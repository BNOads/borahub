import { useState } from "react";
import { Copy, Check, Plus, Trash2, RefreshCw, Loader2, ExternalLink, Calculator, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useUpdateSession,
  useStrategicLinks,
  useCreateLink,
  useDeleteLink,
  useQualificationCriteria,
  useCreateCriterion,
  useDeleteCriterion,
  useSyncGoogleSheet,
  useStrategicLeads,
  useBatchUpdateScoring,
  useSyncLogs,
  StrategicSession,
} from "@/hooks/useStrategicSession";
import { computeLeadScore } from "@/lib/leadScoring";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  session: StrategicSession;
}

export function StrategicConfigTab({ session }: Props) {
  const updateSession = useUpdateSession();
  const { data: links = [] } = useStrategicLinks(session.id);
  const createLink = useCreateLink();
  const deleteLink = useDeleteLink();
  const { data: criteria = [] } = useQualificationCriteria(session.id);
  const createCriterion = useCreateCriterion();
  const deleteCriterion = useDeleteCriterion();
  const syncSheet = useSyncGoogleSheet();
  const { data: leads = [] } = useStrategicLeads(session.id);
  const batchScoring = useBatchUpdateScoring();
  const { data: syncLogs = [] } = useSyncLogs(session.id);

  const [name, setName] = useState(session.name);
  const [description, setDescription] = useState(session.description || "");
  const [sheetUrl, setSheetUrl] = useState(session.google_sheet_url || "");
  const [calendarId, setCalendarId] = useState(session.google_calendar_id || "");
  const [copied, setCopied] = useState(false);

  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkCategory, setNewLinkCategory] = useState("");

  const [newCriterionField, setNewCriterionField] = useState("");
  const [newCriterionOp, setNewCriterionOp] = useState("equals");
  const [newCriterionValue, setNewCriterionValue] = useState("");

  const publicUrl = session.public_slug ? `${window.location.origin}/se/${session.public_slug}` : null;

  const handleSave = () => {
    updateSession.mutate({ id: session.id, name, description: description || null, google_sheet_url: sheetUrl || null, google_calendar_id: calendarId || null });
  };

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddLink = () => {
    if (!newLinkName || !newLinkUrl) return;
    createLink.mutate({ session_id: session.id, name: newLinkName, url: newLinkUrl, category: newLinkCategory || undefined });
    setNewLinkName(""); setNewLinkUrl(""); setNewLinkCategory("");
  };

  const handleAddCriterion = () => {
    if (!newCriterionField || !newCriterionValue) return;
    createCriterion.mutate({ session_id: session.id, field_name: newCriterionField, operator: newCriterionOp, value: newCriterionValue });
    setNewCriterionField(""); setNewCriterionValue("");
  };

  return (
    <div className="space-y-6 mt-4">
      {/* General info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
          <Button onClick={handleSave} disabled={updateSession.isPending}>Salvar</Button>
        </CardContent>
      </Card>

      {/* Google Integrations */}
      <Card>
        <CardHeader><CardTitle className="text-base">Integrações Google</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>URL da Google Sheet</Label>
            <div className="flex gap-2">
              <Input value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
              <Button variant="outline" onClick={() => syncSheet.mutate(session.id)} disabled={syncSheet.isPending || !sheetUrl}>
                {syncSheet.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label>Google Calendar ID</Label>
            <Input value={calendarId} onChange={e => setCalendarId(e.target.value)} placeholder="exemplo@group.calendar.google.com" />
          </div>
          <Button onClick={handleSave} disabled={updateSession.isPending}>Salvar Integrações</Button>
        </CardContent>
      </Card>

      {/* Public link */}
      <Card>
        <CardHeader><CardTitle className="text-base">Link Público</CardTitle></CardHeader>
        <CardContent>
          {publicUrl ? (
            <div className="flex items-center gap-2">
              <Input value={publicUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => window.open(publicUrl, "_blank")}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Slug público não configurado</p>
          )}
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader><CardTitle className="text-base">Links Úteis</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {links.map(link => (
            <div key={link.id} className="flex items-center justify-between border rounded-md p-2">
              <div>
                <p className="text-sm font-medium">{link.name}</p>
                <a href={link.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{link.url}</a>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteLink.mutate(link.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            <Input value={newLinkName} onChange={e => setNewLinkName(e.target.value)} placeholder="Nome" />
            <Input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="URL" />
            <div className="flex gap-2">
              <Input value={newLinkCategory} onChange={e => setNewLinkCategory(e.target.value)} placeholder="Categoria" />
              <Button variant="outline" size="icon" onClick={handleAddLink}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Scoring */}
      <Card>
        <CardHeader><CardTitle className="text-base">Lead Scoring</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Recalcula o scoring de todos os leads baseado em faturamento (≥15k), lucro (≥10k) e empreita (bônus). Os valores são persistidos no banco para uso em filtros e dashboard.
          </p>
          <Button
            onClick={() => {
              const updates = leads.map(lead => {
                const s = computeLeadScore(lead);
                return { id: lead.id, is_qualified: s.isQualified, qualification_score: s.score };
              });
              batchScoring.mutate(updates);
            }}
            disabled={batchScoring.isPending || leads.length === 0}
            className="gap-2"
          >
            {batchScoring.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Recalcular Scoring ({leads.length} leads)
          </Button>
        </CardContent>
      </Card>

      {/* Qualification Criteria */}
      <Card>
        <CardHeader><CardTitle className="text-base">Critérios de Qualificação</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {criteria.map(c => (
            <div key={c.id} className="flex items-center justify-between border rounded-md p-2">
              <p className="text-sm"><span className="font-medium">{c.field_name}</span> {c.operator} <span className="font-mono">{c.value}</span> (peso: {c.weight})</p>
              <Button variant="ghost" size="icon" onClick={() => deleteCriterion.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          <div className="grid grid-cols-4 gap-2">
            <Input value={newCriterionField} onChange={e => setNewCriterionField(e.target.value)} placeholder="Campo" />
            <Select value={newCriterionOp} onValueChange={setNewCriterionOp}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Igual a</SelectItem>
                <SelectItem value="contains">Contém</SelectItem>
                <SelectItem value="greater_than">Maior que</SelectItem>
                <SelectItem value="less_than">Menor que</SelectItem>
                <SelectItem value="not_empty">Não vazio</SelectItem>
              </SelectContent>
            </Select>
            <Input value={newCriterionValue} onChange={e => setNewCriterionValue(e.target.value)} placeholder="Valor" />
            <Button variant="outline" onClick={handleAddCriterion}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </div>
        </CardContent>
      </Card>
      {/* Sync Logs */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Log de Sincronizações</CardTitle></CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sincronização registrada ainda.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {syncLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
                  <div className="flex items-center gap-3">
                    {log.status === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {log.status === "ok" ? (
                        <p className="text-muted-foreground text-xs">
                          {log.total_rows} registros • {log.duplicates_removed} duplicatas removidas
                        </p>
                      ) : (
                        <p className="text-destructive text-xs">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={log.source === "cron" ? "secondary" : "outline"}>
                    {log.source === "cron" ? "Automático" : "Manual"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
