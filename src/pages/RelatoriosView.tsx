import { useState } from "react";
import { FileBarChart, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReports, Report, REPORT_TYPES } from "@/hooks/useReports";
import { CreateReportModal } from "@/components/relatorios/CreateReportModal";
import { ReportHistory } from "@/components/relatorios/ReportHistory";
import { ReportViewer } from "@/components/relatorios/ReportViewer";
import { generateReportPDF } from "@/components/relatorios/ReportPDFGenerator";

export default function RelatoriosView() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: reports, isLoading } = useReports(
    typeFilter !== "all" ? { report_type: typeFilter } : undefined
  );

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
  };

  const handleDownloadPDF = async (report: Report) => {
    await generateReportPDF(report);
  };

  const handleGenerateSuggestion = (suggestion: { title: string; scope: string[] }) => {
    // Open create modal with pre-filled values from suggestion
    setSelectedReport(null);
    setIsCreateModalOpen(true);
    // The modal will handle the suggestion data
  };

  const handleReportCreated = (reportId: string) => {
    // Find and display the newly created report
    const newReport = reports?.find((r) => r.id === reportId);
    if (newReport) {
      setSelectedReport(newReport);
    }
  };

  // If viewing a specific report
  if (selectedReport) {
    return (
      <div className="animate-fade-in">
        <ReportViewer
          report={selectedReport}
          onBack={() => setSelectedReport(null)}
          onDownload={() => handleDownloadPDF(selectedReport)}
          onGenerateSuggestion={handleGenerateSuggestion}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <FileBarChart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-sm text-muted-foreground">
              Gere relatórios executivos com IA sobre sua operação
            </p>
          </div>
        </div>

        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Relatório
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {REPORT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Report History */}
      <ReportHistory
        reports={reports}
        isLoading={isLoading}
        onView={handleViewReport}
        onDownload={handleDownloadPDF}
      />

      {/* Create Modal */}
      <CreateReportModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleReportCreated}
      />
    </div>
  );
}
