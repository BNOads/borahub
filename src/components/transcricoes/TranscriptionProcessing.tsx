import { useEffect } from "react";
import { Loader2, FileAudio, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useTranscriptionPolling, useTranscription } from "@/hooks/useTranscriptions";

interface TranscriptionProcessingProps {
  transcriptionId: string;
  onComplete: () => void;
  onError?: () => void;
}

export function TranscriptionProcessing({
  transcriptionId,
  onComplete,
  onError,
}: TranscriptionProcessingProps) {
  const { data: pollData } = useTranscriptionPolling(transcriptionId, true);

  useEffect(() => {
    if (pollData?.status === "completed") {
      onComplete();
    } else if (pollData?.status === "failed") {
      onError?.();
    }
  }, [pollData?.status, onComplete, onError]);

  const isProcessing = pollData?.status === "processing" || pollData?.status === "pending";
  const isCompleted = pollData?.status === "completed";
  const isFailed = pollData?.status === "failed";

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center">
          {isProcessing && (
            <>
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Transcrevendo seu áudio...</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Estamos processando o arquivo com inteligência artificial. 
                Isso pode levar alguns minutos dependendo do tamanho.
              </p>
              <div className="w-full max-w-xs">
                <Progress value={undefined} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Você pode sair desta página. A transcrição continuará em segundo plano.
              </p>
            </>
          )}

          {isCompleted && (
            <>
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Transcrição concluída!</h3>
              <p className="text-muted-foreground mb-6">
                {pollData?.speakers_count} {pollData?.speakers_count === 1 ? "pessoa identificada" : "pessoas identificadas"}
              </p>
              <Button onClick={onComplete}>
                <FileAudio className="h-4 w-4 mr-2" />
                Ver transcrição
              </Button>
            </>
          )}

          {isFailed && (
            <>
              <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Erro na transcrição</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {pollData?.error_message || "Ocorreu um erro ao processar o arquivo. Tente novamente."}
              </p>
              <Button variant="outline" onClick={onError}>
                Voltar
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
