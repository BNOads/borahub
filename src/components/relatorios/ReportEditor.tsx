import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Report, useUpdateReport } from "@/hooks/useReports";

interface ReportEditorProps {
  report: Report;
  onCancel: () => void;
  onSave: () => void;
}

export function ReportEditor({ report, onCancel, onSave }: ReportEditorProps) {
  const [title, setTitle] = useState(report.title);
  const [content, setContent] = useState(report.content_markdown || "");
  
  const updateReport = useUpdateReport();

  const handleSave = async () => {
    await updateReport.mutateAsync({
      id: report.id,
      title,
      content_markdown: content,
    });
    onSave();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Editar Relatório</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={updateReport.isPending}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateReport.isPending}>
            {updateReport.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-title">Título</Label>
        <Input
          id="report-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-content">
          Conteúdo (Markdown)
        </Label>
        <p className="text-xs text-muted-foreground">
          Use **texto** para negrito, *texto* para itálico, # para títulos, - para listas
        </p>
        <Textarea
          id="report-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}
