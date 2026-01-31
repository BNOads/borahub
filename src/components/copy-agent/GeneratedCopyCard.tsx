import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  Copy, 
  Save, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Mail,
  MessageSquare,
  MessageCircle,
  Smartphone,
  Mic,
  Image,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  whatsapp_grupos: MessageSquare,
  whatsapp_1x1: MessageCircle,
  sms: Smartphone,
  audio: Mic,
  conteudo: Image,
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "E-mail",
  whatsapp_grupos: "WhatsApp Grupos",
  whatsapp_1x1: "WhatsApp 1x1",
  sms: "SMS",
  audio: "Áudio",
  conteudo: "Conteúdo",
};

interface GeneratedCopyCardProps {
  channel: string;
  content: string;
  suggestedName: string;
  scheduledFor?: string;
  onSave: () => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
  isSaved?: boolean;
}

export function GeneratedCopyCard({
  channel,
  content,
  suggestedName,
  scheduledFor,
  onSave,
  onRegenerate,
  isRegenerating = false,
  isSaved = false,
}: GeneratedCopyCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const Icon = CHANNEL_ICONS[channel] || Mail;
  const label = CHANNEL_LABELS[channel] || channel;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copy copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse email format
  const isEmail = channel === "email";
  let subject = "";
  let body = content;
  
  if (isEmail && content.includes("ASSUNTO:")) {
    const lines = content.split("\n");
    const subjectLine = lines.find(l => l.startsWith("ASSUNTO:"));
    if (subjectLine) {
      subject = subjectLine.replace("ASSUNTO:", "").trim();
      body = lines.filter(l => !l.startsWith("ASSUNTO:")).join("\n").trim();
    }
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-xl">
              <Icon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h4 className="font-semibold">{label}</h4>
              {scheduledFor && (
                <p className="text-xs text-muted-foreground">{scheduledFor}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaved && (
              <Badge variant="secondary" className="gap-1">
                <Check className="h-3 w-3" />
                Salva
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {isEmail && subject && (
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <span className="text-xs font-medium text-muted-foreground">Assunto:</span>
              <p className="font-medium mt-1">{subject}</p>
            </div>
          )}
          
          <div className="p-4 bg-muted/30 rounded-xl border border-border">
            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
              {body}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-lg"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-lg"
              onClick={onSave}
              disabled={isSaved}
            >
              <Save className="h-4 w-4" />
              {isSaved ? "Salva" : "Salvar no Banco"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-lg"
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw className={cn("h-4 w-4", isRegenerating && "animate-spin")} />
              Regenerar
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
