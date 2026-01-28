export interface WhisperSegment {
  text: string;
  timestamp: [number, number | null];
}

export interface WhisperResult {
  text: string;
  chunks?: WhisperSegment[];
}

export interface TranscriptSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null;
let isLoading = false;

export async function initWhisper(
  onProgress?: (progress: number, status: string) => void
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (transcriber) return transcriber;
  if (isLoading) {
    // Wait for existing initialization
    while (isLoading) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (transcriber) return transcriber;
  }

  isLoading = true;
  onProgress?.(0, "Carregando modelo Whisper...");

  try {
    // Dynamic import to avoid type complexity issues
    const { pipeline, env } = await import("@huggingface/transformers");
    
    // Configure environment for better compatibility
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    
    // Disable WebGPU completely - force WASM backend only
    // This prevents the "no available backend found" error
    env.backends.onnx.wasm.proxy = false;

    onProgress?.(5, "Usando processamento CPU (WASM)...");

    // Use whisper-base for better accuracy with Portuguese
    // Force device to 'wasm' explicitly to avoid WebGPU issues
    transcriber = await pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-base",
      {
        device: "wasm",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (data: any) => {
          if (data.progress !== undefined) {
            const progress = Math.min(data.progress, 95);
            onProgress?.(progress, data.status || "Baixando modelo...");
          }
        },
      }
    );
    
    onProgress?.(100, "Modelo carregado!");
    return transcriber;
  } catch (error) {
    isLoading = false;
    transcriber = null;
    console.error("Failed to initialize Whisper:", error);
    throw new Error(`Erro ao inicializar transcrição: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  } finally {
    isLoading = false;
  }
}

export async function transcribeAudio(
  audioUrl: string,
  language: string = "pt",
  onProgress?: (progress: number, status: string) => void
): Promise<{ text: string; segments: TranscriptSegment[]; duration: number }> {
  onProgress?.(0, "Inicializando transcrição...");

  const pipe = await initWhisper(onProgress);

  onProgress?.(50, "Transcrevendo áudio...");

  // Map language codes
  const langMap: Record<string, string | undefined> = {
    pt: "portuguese",
    en: "english",
    es: "spanish",
    fr: "french",
    de: "german",
    it: "italian",
    auto: undefined,
  };

  const result = (await pipe(audioUrl, {
    return_timestamps: true,
    language: langMap[language] || langMap.pt,
    task: "transcribe", // Force transcription mode (not translation)
    chunk_length_s: 30,
    stride_length_s: 5,
  })) as WhisperResult;

  onProgress?.(90, "Processando resultado...");

  // Convert chunks to our segment format
  const segments: TranscriptSegment[] = [];
  let lastEnd = 0;

  if (result.chunks && result.chunks.length > 0) {
    result.chunks.forEach((chunk) => {
      const start = chunk.timestamp[0] || lastEnd;
      const end = chunk.timestamp[1] || start + 5;
      lastEnd = end;

      segments.push({
        speaker: "Transcrição", // Whisper não faz diarização
        start,
        end,
        text: chunk.text.trim(),
      });
    });
  } else {
    // If no chunks, create a single segment
    segments.push({
      speaker: "Transcrição",
      start: 0,
      end: 0,
      text: result.text.trim(),
    });
  }

  const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

  onProgress?.(100, "Transcrição concluída!");

  return {
    text: result.text.trim(),
    segments,
    duration: Math.ceil(duration),
  };
}

export async function transcribeFile(
  file: File,
  language: string = "pt",
  onProgress?: (progress: number, status: string) => void
): Promise<{ text: string; segments: TranscriptSegment[]; duration: number }> {
  onProgress?.(0, "Preparando arquivo...");

  // Create object URL for the file
  const audioUrl = URL.createObjectURL(file);

  try {
    const result = await transcribeAudio(audioUrl, language, onProgress);
    return result;
  } finally {
    URL.revokeObjectURL(audioUrl);
  }
}
