import { useState } from "react";
import { FileAudio, Upload, History, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TranscriptionUpload } from "@/components/transcricoes/TranscriptionUpload";
import { TranscriptionHistory } from "@/components/transcricoes/TranscriptionHistory";
import { TranscriptionResult } from "@/components/transcricoes/TranscriptionResult";
import { TranscriptionProcessing } from "@/components/transcricoes/TranscriptionProcessing";
import { useTranscriptions, useTranscription } from "@/hooks/useTranscriptions";
import type { Transcription } from "@/hooks/useTranscriptions";

type ViewState = 
  | { type: "list" }
  | { type: "processing"; transcriptionId: string }
  | { type: "result"; transcription: Transcription };

export default function TranscricoesView() {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [viewState, setViewState] = useState<ViewState>({ type: "list" });
  
  const { data: transcriptions = [], isLoading } = useTranscriptions();

  // If viewing a result, fetch fresh data
  const { data: freshTranscription } = useTranscription(
    viewState.type === "result" ? viewState.transcription.id : undefined
  );

  const handleTranscriptionCreated = (id: string) => {
    setViewState({ type: "processing", transcriptionId: id });
  };

  const handleProcessingComplete = () => {
    const transcription = transcriptions.find(
      (t) => viewState.type === "processing" && t.id === viewState.transcriptionId
    );
    if (transcription) {
      setViewState({ type: "result", transcription });
    } else {
      // Refetch and show result
      setActiveTab("history");
      setViewState({ type: "list" });
    }
  };

  const handleViewTranscription = (transcription: Transcription) => {
    setViewState({ type: "result", transcription });
  };

  const handleBack = () => {
    setViewState({ type: "list" });
  };

  // Show result view
  if (viewState.type === "result") {
    const transcriptionToShow = freshTranscription || viewState.transcription;
    
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            className="mb-6 gap-2"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <TranscriptionResult transcription={transcriptionToShow} />
        </div>
      </div>
    );
  }

  // Show processing view
  if (viewState.type === "processing") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            className="mb-6 gap-2"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <TranscriptionProcessing
            transcriptionId={viewState.transcriptionId}
            onComplete={handleProcessingComplete}
            onError={handleBack}
          />
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileAudio className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Transcrições</h1>
          </div>
          <p className="text-muted-foreground">
            Transcreva vídeos e áudios com identificação automática de participantes.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Nova transcrição
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
              {transcriptions.length > 0 && (
                <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-muted">
                  {transcriptions.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-0">
            <TranscriptionUpload onTranscriptionCreated={handleTranscriptionCreated} />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <TranscriptionHistory
              transcriptions={transcriptions}
              isLoading={isLoading}
              onView={handleViewTranscription}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
