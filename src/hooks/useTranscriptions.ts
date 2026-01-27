import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { transcribeFile } from "@/lib/whisperTranscriber";

export interface TranscriptSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

export interface Transcription {
  id: string;
  user_id: string;
  title: string;
  source_type: string;
  source_id: string | null;
  original_file_path: string | null;
  original_file_name: string | null;
  duration_seconds: number | null;
  language: string | null;
  status: string | null;
  error_message: string | null;
  speakers_count: number | null;
  transcript_text: string | null;
  transcript_segments: unknown;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export function useTranscriptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transcriptions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transcriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transcription[];
    },
    enabled: !!user,
  });
}

export function useTranscription(id: string | undefined) {
  return useQuery({
    queryKey: ["transcription", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("transcriptions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Transcription;
    },
    enabled: !!id,
  });
}

interface CreateTranscriptionParams {
  title: string;
  file: File;
  language: string;
  sourceType?: "upload" | "post" | "lesson";
  sourceId?: string;
  onProgress?: (progress: number, status: string) => void;
}

export function useCreateTranscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      title, 
      file, 
      language, 
      sourceType = "upload", 
      sourceId,
      onProgress 
    }: CreateTranscriptionParams) => {
      if (!user) throw new Error("User not authenticated");

      // 1. Upload file to storage
      onProgress?.(5, "Fazendo upload do arquivo...");
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("video-uploads")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`);
      }

      // 2. Create transcription record with pending status
      onProgress?.(10, "Criando registro de transcrição...");
      const { data: transcription, error: insertError } = await supabase
        .from("transcriptions")
        .insert({
          user_id: user.id,
          title,
          source_type: sourceType,
          source_id: sourceId,
          original_file_path: filePath,
          original_file_name: file.name,
          language,
          status: "processing",
        })
        .select()
        .single();

      if (insertError) {
        // Clean up uploaded file
        await supabase.storage.from("video-uploads").remove([filePath]);
        throw new Error(`Erro ao criar transcrição: ${insertError.message}`);
      }

      try {
        // 3. Process transcription locally with Whisper
        const result = await transcribeFile(file, language, (progress, status) => {
          // Scale progress from 10-95%
          const scaledProgress = 10 + (progress * 0.85);
          onProgress?.(scaledProgress, status);
        });

        // 4. Update transcription with results
        onProgress?.(95, "Salvando transcrição...");
        const { error: updateError } = await supabase
          .from("transcriptions")
          .update({
            status: "completed",
            transcript_text: result.text,
            transcript_segments: JSON.parse(JSON.stringify(result.segments)),
            speakers_count: 1, // Whisper não faz diarização
            duration_seconds: result.duration,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", transcription.id);

        if (updateError) {
          throw new Error(`Erro ao salvar transcrição: ${updateError.message}`);
        }

        onProgress?.(100, "Concluído!");

        return { ...transcription, ...result } as Transcription;
      } catch (error) {
        // Update status to failed
        await supabase
          .from("transcriptions")
          .update({ 
            status: "failed", 
            error_message: error instanceof Error ? error.message : "Erro desconhecido",
            updated_at: new Date().toISOString(),
          })
          .eq("id", transcription.id);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transcriptions"] });
      toast({
        title: "Transcrição concluída",
        description: "A transcrição foi processada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar transcrição",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get transcription to find file path
      const { data: transcription } = await supabase
        .from("transcriptions")
        .select("original_file_path")
        .eq("id", id)
        .single();

      // Delete from database
      const { error } = await supabase
        .from("transcriptions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Delete file from storage if exists
      if (transcription?.original_file_path) {
        await supabase.storage
          .from("video-uploads")
          .remove([transcription.original_file_path]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transcriptions"] });
      toast({
        title: "Transcrição excluída",
        description: "A transcrição foi removida com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}

// Hook to poll for transcription updates (kept for compatibility but less needed now)
export function useTranscriptionPolling(id: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ["transcription-poll", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("transcriptions")
        .select("id, status, transcript_text, speakers_count, duration_seconds, error_message")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling when completed or failed
      if (data?.status === "completed" || data?.status === "failed") {
        return false;
      }
      return 3000; // Poll every 3 seconds
    },
  });
}
