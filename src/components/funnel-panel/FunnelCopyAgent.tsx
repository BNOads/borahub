import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wand2,
  Mail,
  MessageSquare,
  MessageCircle,
  Smartphone,
  Mic,
  Image,
  Loader2,
  Sparkles,
  Download,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";

import { useAuth } from "@/contexts/AuthContext";
import { useFunnelProducts } from "@/hooks/useFunnelProducts";
import { useCreateCopy } from "@/hooks/useCopyBank";
import { supabase } from "@/integrations/supabase/client";

import { CopyScheduleConfig, ScheduleItem } from "@/components/copy-agent/CopyScheduleConfig";
import { GeneratedCopyCard } from "@/components/copy-agent/GeneratedCopyCard";
import { FunnelData } from "./types";

const CHANNELS = [
  { id: "email", label: "E-mail", icon: Mail },
  { id: "whatsapp_grupos", label: "WhatsApp Grupos", icon: MessageSquare },
  { id: "whatsapp_1x1", label: "WhatsApp 1x1", icon: MessageCircle },
  { id: "sms", label: "SMS", icon: Smartphone },
  { id: "audio", label: "Áudios", icon: Mic },
  { id: "conteudo", label: "Conteúdo", icon: Image },
];

const STAGES = [
  { id: "aquecimento", label: "Aquecimento" },
  { id: "captacao", label: "Captação" },
  { id: "cpl_conteudo", label: "CPL/Conteúdo" },
  { id: "evento_aula", label: "Evento/Aula" },
  { id: "abertura_carrinho", label: "Abertura de Carrinho" },
  { id: "carrinho_aberto", label: "Carrinho Aberto" },
  { id: "fechamento", label: "Fechamento" },
  { id: "pos_venda", label: "Pós-venda" },
];

interface GeneratedCopy {
  id: string;
  channel: string;
  content: string;
  suggestedName: string;
  scheduledFor?: string;
  saved: boolean;
}

interface FunnelCopyAgentProps {
  funnel: FunnelData;
}

export function FunnelCopyAgent({ funnel }: FunnelCopyAgentProps) {
  const { user, profile } = useAuth();
  const createCopy = useCreateCopy();
  const { data: funnelProducts = [] } = useFunnelProducts(funnel.id);

  // Form state
  const [selectedProduct, setSelectedProduct] = useState<string>(funnel.product_name || "");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [copyType, setCopyType] = useState<"single" | "schedule">("single");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCopies, setGeneratedCopies] = useState<GeneratedCopy[]>([]);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Get products for dropdown
  const availableProducts = funnelProducts.length > 0
    ? funnelProducts.map((fp) => ({ id: fp.product_id, name: fp.product.name }))
    : funnel.product_name 
      ? [{ id: "default", name: funnel.product_name }]
      : [];

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((c) => c !== channelId)
        : [...prev, channelId]
    );
  };

  const canGenerate = 
    selectedStage && 
    selectedChannels.length > 0 && 
    (copyType === "single" || schedule.length > 0);

  const generateCopy = async (channel: string, scheduledFor?: string) => {
    const { data, error } = await supabase.functions.invoke("generate-copy", {
      body: {
        funnel_name: funnel.name,
        funnel_category: funnel.category,
        product_name: selectedProduct || funnel.product_name,
        funnel_stage: selectedStage,
        channel,
        additional_context: additionalContext,
        scheduled_for: scheduledFor,
      },
    });

    if (error) throw error;
    return data;
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setGeneratedCopies([]);

    try {
      const copies: GeneratedCopy[] = [];

      if (copyType === "single") {
        for (const channel of selectedChannels) {
          const result = await generateCopy(channel);
          copies.push({
            id: crypto.randomUUID(),
            channel,
            content: result.copy,
            suggestedName: result.suggested_name,
            saved: false,
          });
        }
      } else {
        for (const day of schedule) {
          for (const time of day.times) {
            const scheduledFor = `${format(day.date, "dd/MM", { locale: ptBR })} às ${time}`;
            for (const channel of selectedChannels) {
              const result = await generateCopy(channel, scheduledFor);
              copies.push({
                id: crypto.randomUUID(),
                channel,
                content: result.copy,
                suggestedName: result.suggested_name,
                scheduledFor,
                saved: false,
              });
            }
          }
        }
      }

      setGeneratedCopies(copies);
      toast.success(`${copies.length} copy(ies) gerada(s) com sucesso!`);
    } catch (error) {
      console.error("Error generating copies:", error);
      toast.error("Erro ao gerar copies. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (copyId: string) => {
    const copy = generatedCopies.find((c) => c.id === copyId);
    if (!copy) return;

    setRegeneratingId(copyId);

    try {
      const result = await generateCopy(copy.channel, copy.scheduledFor);
      setGeneratedCopies((prev) =>
        prev.map((c) =>
          c.id === copyId
            ? { ...c, content: result.copy, suggestedName: result.suggested_name, saved: false }
            : c
        )
      );
      toast.success("Copy regenerada!");
    } catch (error) {
      console.error("Error regenerating copy:", error);
      toast.error("Erro ao regenerar copy");
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleSave = async (copy: GeneratedCopy) => {
    if (!user || !profile) return;

    createCopy.mutate({
      name: copy.suggestedName,
      author_id: user.id,
      author_name: profile.full_name || profile.email,
      funnel_id: funnel.id,
      funnel_name: funnel.name,
      product_name: selectedProduct || funnel.product_name || null,
      funnel_stage: selectedStage,
      channel: copy.channel,
      content: copy.content,
      scheduled_for: copy.scheduledFor ? new Date(copy.scheduledFor).toISOString() : null,
    }, {
      onSuccess: () => {
        setGeneratedCopies((prev) =>
          prev.map((c) => (c.id === copy.id ? { ...c, saved: true } : c))
        );
      },
    });
  };

  const getChannelLabel = (channelId: string) => {
    return CHANNELS.find((c) => c.id === channelId)?.label || channelId;
  };

  const getStageLabel = (stageId: string) => {
    return STAGES.find((s) => s.id === stageId)?.label || stageId;
  };

  const handleDownloadPDF = () => {
    if (generatedCopies.length === 0) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = 20;

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Copies - ${funnel.name}`, margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100);
    
    const contextInfo = [];
    if (selectedProduct) contextInfo.push(`Produto: ${selectedProduct}`);
    if (selectedStage) contextInfo.push(`Etapa: ${getStageLabel(selectedStage)}`);
    
    if (contextInfo.length > 0) {
      pdf.text(contextInfo.join(" | "), margin, yPosition);
      yPosition += 8;
    }

    pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, yPosition);
    yPosition += 15;

    pdf.setTextColor(0);

    generatedCopies.forEach((copy, index) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      const headerText = `${index + 1}. ${getChannelLabel(copy.channel)}${copy.scheduledFor ? ` - ${copy.scheduledFor}` : ""}`;
      pdf.text(headerText, margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      
      const lines = pdf.splitTextToSize(copy.content, maxWidth);
      lines.forEach((line: string) => {
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, margin, yPosition);
        yPosition += 5;
      });

      yPosition += 10;
    });

    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(
        `Gerado pelo BORA Hub - Página ${i} de ${pageCount}`,
        pageWidth / 2,
        290,
        { align: "center" }
      );
    }

    const fileName = `copies-${funnel.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    pdf.save(fileName);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-accent/20 to-primary/20 rounded-2xl">
          <Sparkles className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Agente de Copy</h2>
          <p className="text-sm text-muted-foreground">
            Gere copies para o funil <span className="font-medium">{funnel.name}</span>
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Configuração
            </CardTitle>
            <CardDescription>
              Defina o contexto para a geração das copies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product Selection */}
            {availableProducts.length > 0 && (
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione um produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.name}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Stage Selection */}
            <div className="space-y-2">
              <Label>Etapa do Funil *</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione a etapa..." />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Copy Type */}
            <div className="space-y-3">
              <Label>Tipo de Geração</Label>
              <RadioGroup
                value={copyType}
                onValueChange={(v) => setCopyType(v as "single" | "schedule")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single-funnel" />
                  <Label htmlFor="single-funnel" className="cursor-pointer">
                    Copy Única
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="schedule" id="schedule-funnel" />
                  <Label htmlFor="schedule-funnel" className="cursor-pointer">
                    Cronograma
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Schedule Config */}
            {copyType === "schedule" && (
              <CopyScheduleConfig schedule={schedule} onChange={setSchedule} />
            )}

            <Separator />

            {/* Channel Selection */}
            <div className="space-y-3">
              <Label>Canais de Distribuição *</Label>
              <div className="grid grid-cols-2 gap-3">
                {CHANNELS.map((channel) => {
                  const Icon = channel.icon;
                  const isSelected = selectedChannels.includes(channel.id);
                  return (
                    <div
                      key={channel.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/50"
                      }`}
                      onClick={() => toggleChannel(channel.id)}
                    >
                      <Checkbox checked={isSelected} />
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{channel.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Additional Context */}
            <div className="space-y-2">
              <Label>Contexto Adicional (opcional)</Label>
              <Textarea
                placeholder="Ex: Foco em urgência, mencionar bônus exclusivo, tom mais descontraído..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                className="rounded-xl min-h-[80px]"
              />
            </div>

            {/* Generate Button */}
            <Button
              className="w-full h-12 gap-2 rounded-xl font-bold"
              variant="gold"
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gerando Copies...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Gerar Copies com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Copies */}
        <div className="space-y-6">
          {generatedCopies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Copies Geradas
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={async () => {
                      const unsavedCopies = generatedCopies.filter((c) => !c.saved);
                      if (unsavedCopies.length === 0) {
                        toast.info("Todas as copies já estão salvas");
                        return;
                      }
                      for (const copy of unsavedCopies) {
                        await handleSave(copy);
                      }
                      toast.success(`${unsavedCopies.length} copies salvas no banco!`);
                    }}
                    disabled={generatedCopies.every((c) => c.saved)}
                  >
                    <Save className="h-4 w-4" />
                    Salvar Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleDownloadPDF}
                  >
                    <Download className="h-4 w-4" />
                    Baixar PDF
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {generatedCopies.map((copy) => (
                    <GeneratedCopyCard
                      key={copy.id}
                      channel={copy.channel}
                      content={copy.content}
                      suggestedName={copy.suggestedName}
                      scheduledFor={copy.scheduledFor}
                      onSave={() => handleSave(copy)}
                      onRegenerate={() => handleRegenerate(copy.id)}
                      onUpdateContent={(newContent) => {
                        setGeneratedCopies((prev) =>
                          prev.map((c) =>
                            c.id === copy.id ? { ...c, content: newContent, saved: false } : c
                          )
                        );
                      }}
                      onRewriteWithAI={async (instructions) => {
                        const { data, error } = await supabase.functions.invoke("agent-rewrite-copy", {
                          body: {
                            original_copy: copy.content,
                            instructions,
                            channel: copy.channel,
                          },
                        });
                        if (error) throw error;
                        setGeneratedCopies((prev) =>
                          prev.map((c) =>
                            c.id === copy.id ? { ...c, content: data.copy, saved: false } : c
                          )
                        );
                      }}
                      isRegenerating={regeneratingId === copy.id}
                      isSaved={copy.saved}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {generatedCopies.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted/50 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-semibold mb-2">Nenhuma copy gerada</h4>
                <p className="text-sm text-muted-foreground max-w-[300px]">
                  Configure as opções ao lado e clique em "Gerar Copies com IA" para começar
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
