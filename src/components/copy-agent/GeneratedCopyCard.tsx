import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Check,
  Pencil,
  Sparkles,
  X,
  Loader2
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
  onUpdateContent: (newContent: string) => void;
  onRewriteWithAI: (instructions: string) => Promise<void>;
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
  onUpdateContent,
  onRewriteWithAI,
  isRegenerating = false,
  isSaved = false,
}: GeneratedCopyCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [rewriteInstructions, setRewriteInstructions] = useState("");
  const [isRewriting, setIsRewriting] = useState(false);

  const Icon = CHANNEL_ICONS[channel] || Mail;
  const label = CHANNEL_LABELS[channel] || channel;

  const handleCopy = async () => {
    // For emails, include the subject as part of the copy
    const textToCopy = isEmail && subject 
      ? `Assunto: ${subject}\n\n${body}` 
      : content;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Copy copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    setEditedContent(content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    onUpdateContent(editedContent);
    setIsEditing(false);
    toast.success("Copy atualizada!");
  };

  const handleRewrite = async () => {
    if (!rewriteInstructions.trim()) {
      toast.error("Adicione instruções para a reescrita");
      return;
    }

    setIsRewriting(true);
    try {
      await onRewriteWithAI(rewriteInstructions);
      setShowRewriteModal(false);
      setRewriteInstructions("");
      toast.success("Copy reescrita com sucesso!");
    } catch (error) {
      toast.error("Erro ao reescrever copy");
    } finally {
      setIsRewriting(false);
    }
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
    <>
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
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[200px] font-sans text-sm"
                  placeholder="Conteúdo da copy..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleSaveEdit}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Salvar Edição
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}

            {!isEditing && (
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
                  onClick={handleStartEdit}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-lg"
                  onClick={() => setShowRewriteModal(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  Reescrever com IA
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
            )}
          </CardContent>
        )}
      </Card>

      {/* Rewrite Modal */}
      <Dialog open={showRewriteModal} onOpenChange={setShowRewriteModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Reescrever com IA
            </DialogTitle>
            <DialogDescription>
              Descreva como você quer que a copy seja reescrita. A IA irá manter o contexto original e aplicar suas instruções.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Instruções para reescrita</Label>
              <Textarea
                placeholder="Ex: Deixe mais urgente, adicione metáfora de obra, encurte o texto, mude o tom para mais informal..."
                value={rewriteInstructions}
                onChange={(e) => setRewriteInstructions(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Copy atual:</p>
              <p className="text-sm line-clamp-3">{content}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRewriteModal(false)}
              disabled={isRewriting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRewrite}
              disabled={isRewriting || !rewriteInstructions.trim()}
              className="gap-2"
            >
              {isRewriting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reescrevendo...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Reescrever
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
