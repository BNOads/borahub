import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Download, Calendar, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Report, REPORT_TYPES, REPORT_SCOPES } from "@/hooks/useReports";
import { ReportSuggestions } from "./ReportSuggestions";

interface ReportViewerProps {
  report: Report;
  onBack: () => void;
  onDownload: () => void;
  onGenerateSuggestion: (suggestion: { title: string; scope: string[] }) => void;
}

export function ReportViewer({ report, onBack, onDownload, onGenerateSuggestion }: ReportViewerProps) {
  const getReportTypeLabel = (type: string) => {
    return REPORT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getScopeLabels = (scopes: string[]) => {
    return scopes
      .map((s) => REPORT_SCOPES.find((scope) => scope.value === s)?.label || s)
      .join(", ");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={onDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Baixar PDF
        </Button>
      </div>

      {/* Report Card */}
      <div className="rounded-xl border bg-card">
        {/* Report Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Badge variant="outline" className="mb-2">
                {getReportTypeLabel(report.report_type)}
              </Badge>
              <h1 className="text-2xl font-bold">{report.title}</h1>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(report.period_start), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                {format(new Date(report.period_end), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>{report.profiles?.full_name || "—"}</span>
            </div>
            <div className="text-xs">
              Gerado em {format(new Date(report.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {report.scope.map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">
                {REPORT_SCOPES.find((scope) => scope.value === s)?.label || s}
              </Badge>
            ))}
          </div>
        </div>

        {/* Report Content */}
        <div className="p-6">
          {report.content_markdown ? (
            <MarkdownRenderer
              content={report.content_markdown}
              className="prose prose-sm dark:prose-invert max-w-none"
            />
          ) : report.content_html ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: report.content_html }}
            />
          ) : (
            <p className="text-muted-foreground">Nenhum conteúdo disponível.</p>
          )}
        </div>
      </div>

      {/* AI Suggestions */}
      {report.ai_suggestions && report.ai_suggestions.length > 0 && (
        <>
          <Separator />
          <ReportSuggestions
            suggestions={report.ai_suggestions}
            onGenerate={onGenerateSuggestion}
          />
        </>
      )}
    </div>
  );
}
