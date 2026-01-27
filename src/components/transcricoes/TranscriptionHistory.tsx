import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileAudio,
  Clock,
  Users,
  Eye,
  Download,
  Trash2,
  MoreVertical,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDuration, generateTranscriptTXT, generateTranscriptPDF, downloadFile } from "@/lib/transcriptionUtils";
import type { Transcription, TranscriptSegment } from "@/hooks/useTranscriptions";
import { useDeleteTranscription } from "@/hooks/useTranscriptions";
import { toast } from "@/hooks/use-toast";

interface TranscriptionHistoryProps {
  transcriptions: Transcription[];
  isLoading: boolean;
  onView: (transcription: Transcription) => void;
}

const statusConfig: Record<string, {
  label: string;
  icon: typeof AlertCircle;
  variant: "secondary" | "default" | "destructive";
  animate?: boolean;
}> = {
  pending: {
    label: "Aguardando",
    icon: AlertCircle,
    variant: "secondary",
  },
  processing: {
    label: "Processando",
    icon: Loader2,
    variant: "secondary",
    animate: true,
  },
  completed: {
    label: "Concluído",
    icon: CheckCircle2,
    variant: "default",
  },
  failed: {
    label: "Erro",
    icon: XCircle,
    variant: "destructive",
  },
};

export function TranscriptionHistory({
  transcriptions,
  isLoading,
  onView,
}: TranscriptionHistoryProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteTranscription = useDeleteTranscription();

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTranscription.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleDownload = (transcription: Transcription, format: "txt" | "pdf") => {
    const segments = (transcription.transcript_segments || []) as TranscriptSegment[];
    const filename = transcription.title.replace(/[^a-zA-Z0-9]/g, "_");

    if (format === "txt") {
      const content = generateTranscriptTXT(segments, transcription.title);
      downloadFile(content, `${filename}.txt`, "text/plain");
    } else {
      const doc = generateTranscriptPDF(segments, transcription.title);
      doc.save(`${filename}.pdf`);
    }
    toast({ title: `Arquivo ${format.toUpperCase()} baixado!` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transcriptions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileAudio className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma transcrição ainda</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Faça upload de um arquivo de áudio ou vídeo para criar sua primeira transcrição.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {transcriptions.map((transcription) => {
            const status = statusConfig[transcription.status];
            const StatusIcon = status.icon;

            return (
              <Card 
                key={transcription.id}
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => transcription.status === "completed" && onView(transcription)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileAudio className="h-6 w-6 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-medium truncate">{transcription.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(transcription.created_at), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            variant={status.variant}
                            className="gap-1.5"
                          >
                            <StatusIcon className={`h-3.5 w-3.5 ${status.animate ? "animate-spin" : ""}`} />
                            {status.label}
                          </Badge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {transcription.status === "completed" && (
                                <>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(transcription); }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualizar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(transcription, "txt"); }}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar TXT
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(transcription, "pdf"); }}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); setDeleteId(transcription.id); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Meta info */}
                      {transcription.status === "completed" && (
                        <div className="flex items-center gap-4 mt-2">
                          {transcription.duration_seconds && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDuration(transcription.duration_seconds)}
                            </span>
                          )}
                          {transcription.speakers_count && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {transcription.speakers_count} {transcription.speakers_count === 1 ? "pessoa" : "pessoas"}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Error message */}
                      {transcription.status === "failed" && transcription.error_message && (
                        <p className="text-xs text-destructive mt-2 truncate">
                          {transcription.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transcrição?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A transcrição e o arquivo original serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTranscription.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
