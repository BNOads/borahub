import { useState } from "react";
import { FileBarChart, Plus, Filter, Upload, FolderPlus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReports, Report, REPORT_TYPES } from "@/hooks/useReports";
import { useReportFolders } from "@/hooks/useReportFolders";
import { CreateReportModal } from "@/components/relatorios/CreateReportModal";
import { UploadReportModal } from "@/components/relatorios/UploadReportModal";
import { CreateFolderModal } from "@/components/relatorios/CreateFolderModal";
import { ReportHistory } from "@/components/relatorios/ReportHistory";
import { ReportFoldersView } from "@/components/relatorios/ReportFoldersView";
import { ReportViewer } from "@/components/relatorios/ReportViewer";
import { generateReportPDF } from "@/components/relatorios/ReportPDFGenerator";

export default function RelatoriosView() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "folders">("folders");

  const { data: reports, isLoading, refetch } = useReports(
    typeFilter !== "all" ? { report_type: typeFilter } : undefined
  );
  const { data: folders } = useReportFolders();

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
  };

  const handleDownloadPDF = async (report: Report) => {
    await generateReportPDF(report);
  };

  const handleGenerateSuggestion = (suggestion: { title: string; scope: string[] }) => {
    setSelectedReport(null);
    setIsCreateModalOpen(true);
  };

  const handleReportCreated = (reportId: string) => {
    const newReport = reports?.find((r) => r.id === reportId);
    if (newReport) {
      setSelectedReport(newReport);
    }
  };

  const handleReportUpdated = async () => {
    await refetch();
    if (selectedReport) {
      const updated = reports?.find((r) => r.id === selectedReport.id);
      if (updated) {
        setSelectedReport(updated);
      }
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
          onReportUpdated={handleReportUpdated}
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

        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsFolderModalOpen(true)} title="Nova Pasta">
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setIsUploadModalOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Gerar com IA</span>
          </Button>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex items-center justify-between gap-3">
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

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "folders")}>
          <TabsList className="h-9">
            <TabsTrigger value="folders" className="gap-1.5 px-3">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Pastas</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5 px-3">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {viewMode === "folders" ? (
        <ReportFoldersView
          folders={folders || []}
          reports={reports || []}
          onViewReport={handleViewReport}
          onDownloadReport={handleDownloadPDF}
        />
      ) : (
        <ReportHistory
          reports={reports}
          isLoading={isLoading}
          onView={handleViewReport}
          onDownload={handleDownloadPDF}
        />
      )}

      {/* Modals */}
      <CreateReportModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleReportCreated}
      />

      <UploadReportModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        onSuccess={handleReportCreated}
      />

      <CreateFolderModal
        open={isFolderModalOpen}
        onOpenChange={setIsFolderModalOpen}
      />
    </div>
  );
}
