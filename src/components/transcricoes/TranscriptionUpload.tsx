import { useState, useRef, useCallback } from "react";
import { Upload, FileAudio, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useCreateTranscription } from "@/hooks/useTranscriptions";

const SUPPORTED_FORMATS = [
  "audio/mp3",
  "audio/mpeg",
  "audio/m4a",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/ogg",
  "audio/opus",
  "audio/x-ms-wma",
  "video/mp4",
  "video/quicktime",
  "video/mpeg",
  "video/x-ms-wmv",
];

const LANGUAGES = [
  { value: "pt", label: "Português (Brasil)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "auto", label: "Detectar automaticamente" },
];

interface TranscriptionUploadProps {
  onTranscriptionCreated?: (id: string) => void;
}

export function TranscriptionUpload({ onTranscriptionCreated }: TranscriptionUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("pt");
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createTranscription = useCreateTranscription();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  }, [title]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const isValidFile = (file: File): boolean => {
    // Check by MIME type or extension
    const validExtensions = [".mp3", ".m4a", ".mp4", ".mov", ".aac", ".wav", ".ogg", ".opus", ".wma", ".mpeg", ".wmv"];
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    return SUPPORTED_FORMATS.includes(file.type) || validExtensions.includes(extension);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = async () => {
    if (!file || !title.trim()) return;

    setProgress(0);
    setProgressStatus("Iniciando...");

    const result = await createTranscription.mutateAsync({
      title: title.trim(),
      file,
      language,
      onProgress: (prog, status) => {
        setProgress(prog);
        setProgressStatus(status);
      },
    });

    if (result?.id) {
      onTranscriptionCreated?.(result.id);
      // Reset form
      setFile(null);
      setTitle("");
      setLanguage("pt");
      setProgress(0);
      setProgressStatus("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setTitle("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Área de upload */}
      <Card
        className={cn(
          "relative border-2 border-dashed transition-all duration-200 cursor-pointer",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          file && "border-solid border-primary/50 bg-primary/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.m4a,.mp4,.mov,.aac,.wav,.ogg,.opus,.wma,.mpeg,.wmv"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="p-8 md:p-12">
          {!file ? (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Arraste um arquivo ou clique para selecionar
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Formatos suportados: MP3, MP4, M4A, MOV, AAC, WAV, OGG, OPUS, WMA, MPEG, WMV
              </p>
              <p className="text-xs text-muted-foreground">
                Tamanho máximo: 100MB • Processado localmente com Whisper AI
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileAudio className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              {!createTranscription.isPending && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Progress durante processamento */}
      {createTranscription.isPending && (
        <Card className="p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="font-medium">Processando transcrição...</p>
                <p className="text-sm text-muted-foreground">{progressStatus}</p>
              </div>
              <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              O modelo Whisper está processando seu áudio localmente. Isso pode levar alguns minutos na primeira vez (download do modelo).
            </p>
          </div>
        </Card>
      )}

      {/* Campos adicionais */}
      {file && !createTranscription.isPending && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-2">
            <Label htmlFor="title">Título da transcrição</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião de planejamento"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Idioma do áudio</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" className="h-12">
                <SelectValue />
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

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || createTranscription.isPending}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            <FileAudio className="h-5 w-5 mr-2" />
            Transcrever com Whisper
          </Button>
        </div>
      )}
    </div>
  );
}
