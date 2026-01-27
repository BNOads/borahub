import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mapa de códigos de idioma ISO 639-1 para ISO 639-3 (ElevenLabs usa ISO 639-3)
const languageMap: Record<string, string> = {
  pt: "por",
  en: "eng",
  es: "spa",
  fr: "fra",
  de: "deu",
  it: "ita",
  auto: "", // Auto-detect
};

interface TranscriptionRequest {
  transcription_id: string;
  file_base64?: string;
  file_url?: string;
  language?: string;
}

interface ElevenLabsWord {
  text: string;
  start: number;
  end: number;
  speaker?: string;
}

interface TranscriptSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!ELEVENLABS_API_KEY) {
    console.error("ELEVENLABS_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "ElevenLabs API key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Supabase credentials not configured");
    return new Response(
      JSON.stringify({ error: "Supabase credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const contentType = req.headers.get("content-type") || "";
    let transcription_id: string;
    let file_base64: string | undefined;
    let file_url: string | undefined;
    let language: string = "pt";
    let audioBlob: Blob;

    // Handle multipart form data (file upload) or JSON
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      transcription_id = formData.get("transcription_id") as string;
      language = (formData.get("language") as string) || "pt";
      const file = formData.get("file") as File;
      
      if (!file) {
        throw new Error("No file provided in form data");
      }
      
      audioBlob = file;
    } else {
      const body: TranscriptionRequest = await req.json();
      transcription_id = body.transcription_id;
      file_base64 = body.file_base64;
      file_url = body.file_url;
      language = body.language || "pt";

      if (file_base64) {
        // Decode base64 to blob
        const binaryString = atob(file_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBlob = new Blob([bytes]);
      } else if (file_url) {
        // Download file from URL
        console.log("Downloading file from URL:", file_url);
        const fileResponse = await fetch(file_url);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file: ${fileResponse.status}`);
        }
        audioBlob = await fileResponse.blob();
      } else {
        throw new Error("No file provided (file_base64 or file_url required)");
      }
    }

    if (!transcription_id) {
      throw new Error("transcription_id is required");
    }

    console.log(`Processing transcription ${transcription_id}, language: ${language}`);

    // Update status to processing
    await supabase
      .from("transcriptions")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", transcription_id);

    // Prepare form data for ElevenLabs API
    const apiFormData = new FormData();
    apiFormData.append("file", audioBlob, "audio.mp3");
    apiFormData.append("model_id", "scribe_v2");
    apiFormData.append("diarize", "true");
    apiFormData.append("tag_audio_events", "false");
    
    // Set language code if not auto-detect
    const languageCode = languageMap[language] || languageMap.pt;
    if (languageCode) {
      apiFormData.append("language_code", languageCode);
    }

    console.log("Calling ElevenLabs Speech-to-Text API...");
    
    const elevenlabsResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: apiFormData,
    });

    if (!elevenlabsResponse.ok) {
      const errorText = await elevenlabsResponse.text();
      console.error("ElevenLabs API error:", elevenlabsResponse.status, errorText);
      
      await supabase
        .from("transcriptions")
        .update({
          status: "failed",
          error_message: `ElevenLabs API error: ${elevenlabsResponse.status}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transcription_id);

      throw new Error(`ElevenLabs API error: ${elevenlabsResponse.status} - ${errorText}`);
    }

    const result = await elevenlabsResponse.json();
    console.log("ElevenLabs response received, processing...");

    // Process words into segments grouped by speaker
    const words: ElevenLabsWord[] = result.words || [];
    const segments: TranscriptSegment[] = [];
    const speakerSet = new Set<string>();

    let currentSegment: TranscriptSegment | null = null;

    for (const word of words) {
      const speaker = word.speaker || "speaker_0";
      speakerSet.add(speaker);

      if (!currentSegment || currentSegment.speaker !== speaker) {
        // Start new segment
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          speaker: speaker.replace("speaker_", "Pessoa "),
          start: word.start,
          end: word.end,
          text: word.text,
        };
      } else {
        // Continue current segment
        currentSegment.end = word.end;
        currentSegment.text += " " + word.text;
      }
    }

    // Push last segment
    if (currentSegment) {
      segments.push(currentSegment);
    }

    // Calculate duration from last word
    const durationSeconds = words.length > 0 
      ? Math.ceil(words[words.length - 1].end)
      : 0;

    // Update transcription with results
    const { error: updateError } = await supabase
      .from("transcriptions")
      .update({
        status: "completed",
        transcript_text: result.text,
        transcript_segments: segments,
        speakers_count: speakerSet.size,
        duration_seconds: durationSeconds,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", transcription_id);

    if (updateError) {
      console.error("Error updating transcription:", updateError);
      throw new Error(`Failed to save transcription: ${updateError.message}`);
    }

    console.log(`Transcription ${transcription_id} completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        transcription_id,
        text: result.text,
        segments,
        speakers_count: speakerSet.size,
        duration_seconds: durationSeconds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Transcription error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
