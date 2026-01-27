import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  FolderInput,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Report, REPORT_TYPES } from "@/hooks/useReports";
import { ReportFolder, useDeleteReportFolder, useUpdateReportFolder, useMoveReportToFolder } from "@/hooks/useReportFolders";

interface ReportFoldersViewProps {
  folders: ReportFolder[];
  reports: Report[];
  onViewReport: (report: Report) => void;
  onDownloadReport: (report: Report) => void;
}

export function ReportFoldersView({
  folders,
  reports,
  onViewReport,
  onDownloadReport,
}: ReportFoldersViewProps) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingFolder, setDeletingFolder] = useState<ReportFolder | null>(null);

  const updateFolder = useUpdateReportFolder();
  const deleteFolder = useDeleteReportFolder();
  const moveReport = useMoveReportToFolder();

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getReportsInFolder = (folderId: string) => {
    return reports.filter((r) => r.folder_id === folderId);
  };

  const getUnfiledReports = () => {
    return reports.filter((r) => !r.folder_id);
  };

  const handleStartRename = (folder: ReportFolder) => {
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
  };

  const handleSaveRename = async () => {
    if (editingFolderId && editingName.trim()) {
      await updateFolder.mutateAsync({ id: editingFolderId, name: editingName.trim() });
    }
    setEditingFolderId(null);
    setEditingName("");
  };

  const handleDeleteFolder = async () => {
    if (deletingFolder) {
      await deleteFolder.mutateAsync(deletingFolder.id);
      setDeletingFolder(null);
    }
  };

  const handleMoveToFolder = async (reportId: string, folderId: string | null) => {
    await moveReport.mutateAsync({ reportId, folderId });
  };

  const getReportTypeLabel = (type: string) => {
    return REPORT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const ReportItem = ({ report }: { report: Report }) => (
    <div
      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onViewReport(report)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{report.title}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(report.period_start), "dd/MM", { locale: ptBR })} -{" "}
            {format(new Date(report.period_end), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs shrink-0">
          {getReportTypeLabel(report.report_type)}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onViewReport(report)}>
              <FileText className="h-4 w-4 mr-2" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownloadReport(report)}>
              Baixar PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="h-4 w-4 mr-2" />
                Mover para
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleMoveToFolder(report.id, null)}>
                  <Folder className="h-4 w-4 mr-2" />
                  Sem pasta
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {folders.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => handleMoveToFolder(report.id, folder.id)}
                  >
                    <Folder className="h-4 w-4 mr-2" style={{ color: folder.color || undefined }} />
                    {folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Folders */}
      {folders.map((folder) => {
        const folderReports = getReportsInFolder(folder.id);
        const isOpen = openFolders.has(folder.id);
        const isEditing = editingFolderId === folder.id;

        return (
          <Collapsible key={folder.id} open={isOpen} onOpenChange={() => toggleFolder(folder.id)}>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-3 flex-1 text-left">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  {isOpen ? (
                    <FolderOpen className="h-5 w-5" style={{ color: folder.color || undefined }} />
                  ) : (
                    <Folder className="h-5 w-5" style={{ color: folder.color || undefined }} />
                  )}
                  {isEditing ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleSaveRename}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-sm w-40"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium">{folder.name}</span>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {folderReports.length}
                  </Badge>
                </button>
              </CollapsibleTrigger>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleStartRename(folder)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Renomear
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeletingFolder(folder)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <CollapsibleContent className="pl-6 pt-2 space-y-2">
              {folderReports.length > 0 ? (
                folderReports.map((report) => <ReportItem key={report.id} report={report} />)
              ) : (
                <p className="text-sm text-muted-foreground py-2 pl-4">Nenhum relatório nesta pasta</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Unfiled reports */}
      {getUnfiledReports().length > 0 && (
        <div className="space-y-2">
          {folders.length > 0 && (
            <p className="text-sm font-medium text-muted-foreground pt-2">Sem pasta</p>
          )}
          {getUnfiledReports().map((report) => (
            <ReportItem key={report.id} report={report} />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingFolder} onOpenChange={() => setDeletingFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
            <AlertDialogDescription>
              A pasta "{deletingFolder?.name}" será excluída. Os relatórios dentro dela não serão
              apagados, apenas ficarão sem pasta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
