import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, Mic, FileAudio, X, Loader2 } from "lucide-react";
import { transcribeFile } from "@/lib/whisperTranscriber";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TranscribeFromPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptionComplete: (text: string) => void;
  postId?: string;
}

const LANGUAGES = [
  { value: "pt", label: "Português" },
  { value: "en", label: "Inglês" },
  { value: "es", label: "Espanhol" },
  { value: "auto", label: "Detectar automaticamente" },
];

const ACCEPTED_FORMATS = [
  ".mp3",
  ".mp4",
  ".m4a",
  ".wav",
  ".ogg",
  ".webm",
  ".mov",
  ".mpeg",
  ".aac",
  ".opus",
];

export function TranscribeFromPostModal({
  isOpen,
  onClose,
  onTranscriptionComplete,
  postId,
}: TranscribeFromPostModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("pt");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(selectedFile: File) {
    // Validate file type
    const extension = "." + selectedFile.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_FORMATS.includes(extension)) {
      toast.error(`Formato não suportado. Use: ${ACCEPTED_FORMATS.join(", ")}`);
      return;
    }

    // Validate file size (100MB max)
    if (selectedFile.size > 100 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo permitido: 100MB");
      return;
    }

    setFile(selectedFile);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleTranscribe() {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage("Iniciando transcrição...");

    try {
      const result = await transcribeFile(file, language, (prog, status) => {
        setProgress(prog);
        setStatusMessage(status);
      });

      onTranscriptionComplete(result.text);
      toast.success("Transcrição concluída!");
      handleClose();
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error(
        `Erro na transcrição: ${error instanceof Error ? error.message : "Erro desconhecido"}`
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function handleClose() {
    if (isProcessing) return;
    setFile(null);
    setProgress(0);
    setStatusMessage("");
    onClose();
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Transcrever Vídeo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drop zone / File display */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FORMATS.join(",")}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="hidden"
              />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Arraste o arquivo ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos: MP3, MP4, M4A, WAV, OGG, WEBM, MOV
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Máximo: 100MB
              </p>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileAudio className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Language selection - hidden during processing */}
          {!isProcessing && (
            <div className="space-y-2">
              <Label htmlFor="language">Idioma do áudio</Label>
              <Select
                value={language}
                onValueChange={setLanguage}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Selecione o idioma" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Enhanced Progress display */}
          {isProcessing && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center space-y-4">
              {/* Large animated icon */}
              <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              
              {/* Large percentage */}
              <div className="text-4xl font-bold text-primary">
                {Math.round(progress)}%
              </div>
              
              {/* Thicker progress bar */}
              <Progress value={progress} className="h-3" />
              
              {/* Status messages */}
              <div className="space-y-1">
                <p className="font-medium text-foreground">{statusMessage}</p>
                <p className="text-xs text-muted-foreground">
                  {progress < 20
                    ? "Na primeira vez, o modelo (~75MB) será baixado e ficará em cache."
                    : "Processando localmente no seu navegador..."}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTranscribe}
            disabled={!file || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Transcrevendo...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Transcrever
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
