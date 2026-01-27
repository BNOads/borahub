import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTimestamp, getSpeakerColor, copyToClipboard } from "@/lib/transcriptionUtils";
import type { TranscriptSegment } from "@/hooks/useTranscriptions";

interface TranscriptionSegmentProps {
  segment: TranscriptSegment;
  speakers: string[];
  onTimestampClick?: (seconds: number) => void;
}

export function TranscriptionSegmentCard({ 
  segment, 
  speakers,
  onTimestampClick 
}: TranscriptionSegmentProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(segment.text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const colorClasses = getSpeakerColor(segment.speaker, speakers);

  return (
    <div className={cn(
      "group relative rounded-xl border p-4 transition-all hover:shadow-sm",
      colorClasses
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">
            {segment.speaker}
          </span>
          <button
            onClick={() => onTimestampClick?.(segment.start)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            [{formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}]
          </button>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Text content */}
      <p className="text-sm leading-relaxed text-foreground/90">
        {segment.text}
      </p>
    </div>
  );
}
