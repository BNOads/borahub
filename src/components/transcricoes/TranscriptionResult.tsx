import { useState } from "react";
import { 
  Copy, 
  Check, 
  Download, 
  FileText, 
  FileType, 
  Clock, 
  Users,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TranscriptionSegmentCard } from "./TranscriptionSegment";
import {
  formatDuration,
  generateTranscriptTXT,
  generateTranscriptPDF,
  downloadFile,
  copyToClipboard,
  getUniqueSpeakers,
} from "@/lib/transcriptionUtils";
import type { Transcription, TranscriptSegment } from "@/hooks/useTranscriptions";
import { toast } from "@/hooks/use-toast";

interface TranscriptionResultProps {
  transcription: Transcription;
  onTimestampClick?: (seconds: number) => void;
}

export function TranscriptionResult({ 
  transcription, 
  onTimestampClick 
}: TranscriptionResultProps) {
  const [copied, setCopied] = useState(false);

  const segments = (transcription.transcript_segments || []) as TranscriptSegment[];
  const speakers = getUniqueSpeakers(segments);

  const handleCopyAll = async () => {
    if (!transcription.transcript_text) return;
    
    const success = await copyToClipboard(transcription.transcript_text);
    if (success) {
      setCopied(true);
      toast({ title: "Texto copiado!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTXT = () => {
    const content = generateTranscriptTXT(segments, transcription.title);
    const filename = `${transcription.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    downloadFile(content, filename, "text/plain");
    toast({ title: "Arquivo TXT baixado!" });
  };

  const handleDownloadPDF = (includeTimestamps: boolean = true) => {
    const doc = generateTranscriptPDF(segments, transcription.title, includeTimestamps);
    const suffix = includeTimestamps ? "" : "_sem_timestamps";
    const filename = `${transcription.title.replace(/[^a-zA-Z0-9]/g, "_")}${suffix}.pdf`;
    doc.save(filename);
    toast({ title: "Arquivo PDF baixado!" });
  };

  return (
    <div className="space-y-6">
      {/* Header com info e ações */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{transcription.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {transcription.duration_seconds && (
                  <Badge variant="secondary" className="gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(transcription.duration_seconds)}
                  </Badge>
                )}
                {transcription.speakers_count && (
                  <Badge variant="secondary" className="gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {transcription.speakers_count} {transcription.speakers_count === 1 ? "pessoa" : "pessoas"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAll}
                className="gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copiar texto
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Baixar
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownloadTXT} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Baixar TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadPDF(true)} className="gap-2">
                    <FileType className="h-4 w-4" />
                    PDF com timestamps
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadPDF(false)} className="gap-2">
                    <FileType className="h-4 w-4" />
                    PDF sem timestamps
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Legenda de speakers */}
      {speakers.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Participantes:</span>
          {speakers.map((speaker) => (
            <Badge 
              key={speaker} 
              variant="outline"
              className="text-xs"
            >
              {speaker}
            </Badge>
          ))}
        </div>
      )}

      {/* Segmentos da transcrição */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-3">
              {segments.map((segment, index) => (
                <TranscriptionSegmentCard
                  key={index}
                  segment={segment}
                  speakers={speakers}
                  onTimestampClick={onTimestampClick}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
